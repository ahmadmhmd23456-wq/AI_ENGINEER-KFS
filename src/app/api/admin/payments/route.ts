import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import { getArabicVariants } from "@/lib/arabic-search";

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      const variants = getArabicVariants(search);
      where.OR = [
        { transactionId: { contains: search } },
        { gatewayOrderId: { contains: search } },
        ...variants.map((v) => ({ user: { name: { contains: v, mode: "insensitive" as const } } })),
        { user: { phone: { contains: search } } },
        { user: { email: { contains: search, mode: "insensitive" as const } } },
        { subject: { name: { contains: search, mode: "insensitive" as const } } },
      ];
    }

    const purchases = await prisma.purchase.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        subject: { select: { id: true, name: true, code: true, term: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        academicLevelId: true,
        department: true,
        academicLevel: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { name: "asc" },
    });

    const subjects = await prisma.subject.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        price: true,
        term: true,
        department: true,
        academicLevelId: true,
        academicLevel: { select: { name: true, slug: true } },
      },
      orderBy: [{ term: "asc" }, { order: "asc" }],
    });

    const allCompleted = await prisma.purchase.findMany({
      where: {
        status: "COMPLETED",
        user: { role: "STUDENT" },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            department: true,
            academicLevel: { select: { name: true } },
          },
        },
        subject: {
          select: { id: true, name: true, code: true, term: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    type StudentAnalyticsBucket = {
      user: {
        id: string;
        name: string;
        phone: string | null;
        email: string;
        department: string | null;
        academicLevelName: string | null;
      };
      bundleSubjects: { id: string; name: string; code: string | null; term: number }[];
      singleSubjects: {
        id: string;
        name: string;
        code: string | null;
        term: number;
        amount: number;
        paymentMethod: string;
        createdAt: Date;
      }[];
      bundlePaid: number;
      singlePaid: number;
      latestAt: Date;
    };

    const byStudent = new Map<string, StudentAnalyticsBucket>();
    for (const p of allCompleted) {
      if (!p.user || !p.subject) continue;
      let bucket = byStudent.get(p.userId);
      if (!bucket) {
        bucket = {
          user: {
            id: p.user.id,
            name: p.user.name,
            phone: p.user.phone,
            email: p.user.email,
            department: p.user.department,
            academicLevelName: p.user.academicLevel?.name || null,
          },
          bundleSubjects: [],
          singleSubjects: [],
          bundlePaid: 0,
          singlePaid: 0,
          latestAt: p.createdAt,
        };
        byStudent.set(p.userId, bucket);
      }

      if (p.createdAt > bucket.latestAt) {
        bucket.latestAt = p.createdAt;
      }

      const isBundle = p.paymentMethod === "BUNDLE_GRANT" || p.couponCode === "BUNDLE_1200";
      if (isBundle) {
        bucket.bundleSubjects.push({
          id: p.subject.id,
          name: p.subject.name,
          code: p.subject.code,
          term: p.subject.term,
        });
        bucket.bundlePaid += Number(p.amount) || 0;
      } else {
        bucket.singleSubjects.push({
          id: p.subject.id,
          name: p.subject.name,
          code: p.subject.code,
          term: p.subject.term,
          amount: Number(p.amount) || 0,
          paymentMethod: p.paymentMethod,
          createdAt: p.createdAt,
        });
        bucket.singlePaid += Number(p.amount) || 0;
      }
    }

    const bundleSubscribers: any[] = [];
    const singleSubscribers: any[] = [];
    const singleSubjectMap = new Map<
      string,
      { id: string; name: string; code: string | null; count: number }
    >();

    for (const bucket of byStudent.values()) {
      if (bucket.bundleSubjects.length > 0) {
        bundleSubscribers.push({
          user: bucket.user,
          subjects: bucket.bundleSubjects,
          extraSingleSubjects: bucket.singleSubjects,
          totalPaid: bucket.bundlePaid + bucket.singlePaid,
          latestAt: bucket.latestAt,
        });
      } else if (bucket.singleSubjects.length > 0) {
        singleSubscribers.push({
          user: bucket.user,
          subjects: bucket.singleSubjects,
          totalPaid: bucket.singlePaid,
          latestAt: bucket.latestAt,
        });
        for (const sub of bucket.singleSubjects) {
          const cur = singleSubjectMap.get(sub.id) || {
            id: sub.id,
            name: sub.name,
            code: sub.code,
            count: 0,
          };
          cur.count += 1;
          singleSubjectMap.set(sub.id, cur);
        }
      }
    }

    const subjectSingleCounts = Array.from(singleSubjectMap.values()).sort(
      (a, b) => b.count - a.count
    );

    const analytics = {
      bundleSubscribersCount: bundleSubscribers.length,
      singleSubscribersCount: singleSubscribers.length,
      totalSingleSubjectsCount: singleSubscribers.reduce(
        (sum, item) => sum + item.subjects.length,
        0
      ),
      bundleRevenue: bundleSubscribers.reduce((sum, item) => sum + item.totalPaid, 0),
      singleRevenue: singleSubscribers.reduce((sum, item) => sum + item.totalPaid, 0),
      bundleSubscribers,
      singleSubscribers,
      subjectSingleCounts,
    };

    return NextResponse.json({ purchases, students, subjects, analytics });
  } catch (error) {
    console.error("Admin Payments GET Error:", error);
    return NextResponse.json({ error: "فشل تحميل المدفوعات" }, { status: 500 });
  }
}

// فتح مادة واحدة أو تفعيل عرض كل المواد (1200 ج.م) يدوياً للطالب
export async function POST(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await req.json();
    const { userId, subjectId, subjectIds, term, action = "SINGLE_GRANT", adminNotes } = body;

    if (!userId) {
      return NextResponse.json({ error: "برجاء اختيار الطالب أولاً" }, { status: 400 });
    }

    if (action === "BUNDLE_GRANT") {
      const student = await prisma.user.findUnique({
        where: { id: userId },
        include: { academicLevel: { select: { id: true, slug: true, name: true } } },
      });
      if (!student) {
        return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 });
      }

      let targetSubjects: { id: string; name: string }[] = [];
      if (Array.isArray(subjectIds) && subjectIds.length > 0) {
        targetSubjects = await prisma.subject.findMany({
          where: { id: { in: subjectIds }, isActive: true },
          select: { id: true, name: true },
          orderBy: [{ term: "asc" }, { order: "asc" }],
        });
      } else {
        const isPrep = student.academicLevel?.slug === "prep";
        const targetDept = isPrep ? "GENERAL" : student.department || null;
        const whereClause: any = { isActive: true };
        if (student.academicLevelId) {
          whereClause.academicLevelId = student.academicLevelId;
        }
        if (term && term !== "ALL") {
          whereClause.term = parseInt(String(term), 10) || 1;
        }
        if (targetDept) {
          whereClause.OR = [
            { department: targetDept },
            { department: "GENERAL" },
            { department: null },
          ];
        }
        targetSubjects = await prisma.subject.findMany({
          where: whereClause,
          select: { id: true, name: true },
          orderBy: [{ term: "asc" }, { order: "asc" }],
        });
      }

      if (targetSubjects.length === 0) {
        return NextResponse.json(
          { error: "لا توجد مواد متاحة في فرقة وقسم هذا الطالب لتفعيل العرض." },
          { status: 400 }
        );
      }

      const ts = Date.now();
      const noteText =
        adminNotes?.trim() ||
        `تفعيل عرض كل المواد (1200 ج.م) — ${targetSubjects.length} مواد`;

      await prisma.$transaction(
        targetSubjects.map((sub, idx) =>
          prisma.purchase.upsert({
            where: {
              userId_subjectId: { userId, subjectId: sub.id },
            },
            update: {
              status: "COMPLETED",
              amount: idx === 0 ? 1200 : 0,
              paymentMethod: "BUNDLE_GRANT",
              paymentGateway: "MANUAL",
              couponCode: "BUNDLE_1200",
              adminNotes: noteText,
            },
            create: {
              userId,
              subjectId: sub.id,
              amount: idx === 0 ? 1200 : 0,
              status: "COMPLETED",
              paymentMethod: "BUNDLE_GRANT",
              paymentGateway: "MANUAL",
              couponCode: "BUNDLE_1200",
              transactionId: `BUNDLE_TX_${ts}_${idx}`,
              adminNotes: noteText,
            },
          })
        )
      );

      return NextResponse.json({
        success: true,
        unlockedCount: targetSubjects.length,
        message: `تم تفعيل عرض كل المواد (${targetSubjects.length} مواد) للطالب بقيمة 1200 ج.م بنجاح!`,
      });
    }

    if (!subjectId) {
      return NextResponse.json({ error: "برجاء اختيار الطالب والمادة" }, { status: 400 });
    }

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) return NextResponse.json({ error: "المادة غير موجودة" }, { status: 404 });

    const purchase = await prisma.purchase.upsert({
      where: {
        userId_subjectId: { userId, subjectId },
      },
      update: {
        status: "COMPLETED",
        amount: subject.price,
        paymentMethod: "MANUAL_GRANT",
        paymentGateway: "MANUAL",
        adminNotes: adminNotes || "فتح مادة واحدة يدوياً من الأدمن",
      },
      create: {
        userId,
        subjectId,
        amount: subject.price,
        status: "COMPLETED",
        paymentMethod: "MANUAL_GRANT",
        paymentGateway: "MANUAL",
        transactionId: "MANUAL_TX_" + Date.now(),
        adminNotes: adminNotes || "فتح مادة واحدة يدوياً من الأدمن",
      },
    });

    return NextResponse.json({ success: true, message: "تم تفعيل المادة للطالب يدوياً بنجاح!", purchase });
  } catch (error: any) {
    console.error("Manual Grant Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
