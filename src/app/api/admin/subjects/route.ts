import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// جلب قائمة المواد
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const levelId = searchParams.get("levelId");
    const term = searchParams.get("term");
    const department = searchParams.get("department");

    const where: any = {};
    if (levelId) where.academicLevelId = levelId;
    if (term) where.term = parseInt(term);
    if (department && department !== "ALL") {
      where.department = department;
    }

    const subjects = await prisma.subject.findMany({
      where,
      include: {
        academicLevel: true,
        _count: {
          select: {
            lessons: true,
            questions: true,
            exams: true,
            purchases: { where: { status: "COMPLETED" } },
          },
        },
      },
      orderBy: [
        { order: "asc" },
        { academicLevel: { order: "asc" } },
        { term: "asc" },
        { createdAt: "asc" },
      ],
    });

    const levels = await prisma.academicLevel.findMany({
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ subjects, levels });
  } catch (error) {
    console.error("Admin Subjects GET Error:", error);
    return NextResponse.json({ error: "فشل تحميل المواد" }, { status: 500 });
  }
}

// إضافة أو تعديل مادة
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      name,
      code,
      description,
      price,
      academicLevelId,
      term,
      order,
      imageUrl,
      isActive,
      department,
    } = body;

    if (!name || !academicLevelId || !term) {
      return NextResponse.json(
        { error: "برجاء استكمال الحقول الإلزامية: اسم المادة، الدفعة، والترم" },
        { status: 400 }
      );
    }

    const priceDecimal = price !== undefined ? parseFloat(price) : 50.0;
    const orderNum = order !== undefined && order !== "" ? parseInt(order.toString(), 10) : 0;
    const deptValue = department || "GENERAL";

    let subject;
    if (id) {
      // تعديل مادة حالية
      subject = await prisma.subject.update({
        where: { id },
        data: {
          name,
          code,
          description,
          price: priceDecimal,
          academicLevelId,
          term: parseInt(term),
          order: orderNum,
          imageUrl,
          isActive: isActive !== undefined ? isActive : true,
          department: deptValue,
        },
      });
    } else {
      // إنشاء مادة جديدة
      subject = await prisma.subject.create({
        data: {
          name,
          code,
          description,
          price: priceDecimal,
          academicLevelId,
          term: parseInt(term),
          order: orderNum,
          imageUrl,
          isActive: isActive !== undefined ? isActive : true,
          department: deptValue,
        },
      });
    }

    return NextResponse.json({ success: true, subject });
  } catch (error: any) {
    console.error("Admin Subjects POST Error:", error);
    return NextResponse.json(
      { error: "فشل حفظ بيانات المادة: " + (error.message || "") },
      { status: 500 }
    );
  }
}

// إعادة ترتيب المواد (Reorder)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, swap } = body;

    // حالة تبديل مادتين مباشرة (Swap)
    if (swap && swap.id1 && swap.id2) {
      const sub1 = await prisma.subject.findUnique({ where: { id: swap.id1 }, select: { id: true, order: true } });
      const sub2 = await prisma.subject.findUnique({ where: { id: swap.id2 }, select: { id: true, order: true } });

      if (sub1 && sub2) {
        await prisma.$transaction([
          prisma.subject.update({ where: { id: sub1.id }, data: { order: sub2.order } }),
          prisma.subject.update({ where: { id: sub2.id }, data: { order: sub1.order } }),
        ]);
        return NextResponse.json({ success: true, message: "تم تبديل الترتيب بنجاح" });
      }
    }

    // حالة تحديث قائمة الترتيب كاملاً
    if (Array.isArray(items)) {
      const updateOps = items.map((item: { id: string; order: number }) =>
        prisma.subject.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      );
      await prisma.$transaction(updateOps);
      return NextResponse.json({ success: true, message: "تم تحديث ترتيب المواد بنجاح" });
    }

    return NextResponse.json({ error: "بيانات الترتيب غير صالحة" }, { status: 400 });
  } catch (error: any) {
    console.error("Admin Subjects PATCH Reorder Error:", error);
    return NextResponse.json({ error: "فشل تحديث الترتيب" }, { status: 500 });
  }
}

// حذف مادة
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "معرّف المادة مطلوب" }, { status: 400 });
    }

    await prisma.subject.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "تم حذف المادة بنجاح" });
  } catch (error: any) {
    console.error("Admin Subjects DELETE Error:", error);
    return NextResponse.json({ error: "فشل حذف المادة" }, { status: 500 });
  }
}
