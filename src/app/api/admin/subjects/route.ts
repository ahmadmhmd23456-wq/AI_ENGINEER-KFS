import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// جلب قائمة المواد
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const levelId = searchParams.get("levelId");
    const term = searchParams.get("term");

    const where: any = {};
    if (levelId) where.academicLevelId = levelId;
    if (term) where.term = parseInt(term);

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
      orderBy: [{ academicLevel: { order: "asc" } }, { term: "asc" }, { order: "asc" }],
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
    const { id, name, code, description, price, academicLevelId, term, order, imageUrl, isActive } = body;

    if (!name || !academicLevelId || !term) {
      return NextResponse.json(
        { error: "برجاء استكمال الحقول الإلزامية: اسم المادة، الدفعة، والترم" },
        { status: 400 }
      );
    }

    const priceDecimal = price !== undefined ? parseFloat(price) : 50.0;

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
          order: order ? parseInt(order) : 0,
          imageUrl,
          isActive: isActive !== undefined ? isActive : true,
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
          order: order ? parseInt(order) : 0,
          imageUrl,
          isActive: isActive !== undefined ? isActive : true,
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
