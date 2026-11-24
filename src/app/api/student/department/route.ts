import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const DEPARTMENTS = [
  {
    id: "AI",
    name: "هندسة الذكاء الاصطناعي",
    shortName: "ذكاء اصطناعي",
    badge: "AI & Smart Systems",
    icon: "Brain",
    gradient: "from-cyan-500/20 via-blue-600/20 to-indigo-600/30",
    border: "border-cyan-500/40 hover:border-cyan-400",
    glow: "shadow-cyan-500/20",
    tagColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    description: "خوارزميات التعلم الآلي، الرؤية الحاسوبية، النظم الخبيرة، ومعالجة البيانات الضخمة والنماذج التوليدية.",
    focusAreas: ["تعلم الآلة والعميق", "رؤية حاسوبية", "معالجة اللغات الطبيعية NLP", "خوارزميات وهياكل بيانات"]
  },
  {
    id: "MECHATRONICS",
    name: "هندسة الميكاترونكس والروبوتات",
    shortName: "ميكاترونكس",
    badge: "Robotics & Automation",
    icon: "Bot",
    gradient: "from-amber-500/20 via-orange-600/20 to-red-600/30",
    border: "border-amber-500/40 hover:border-amber-400",
    glow: "shadow-amber-500/20",
    tagColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    description: "الأنظمة الميكانيكية الذكية، التحكم الآلي PLC، الروبوتات الصناعية، والدوائر الإلكترونية المدمجة.",
    focusAreas: ["التحكم الآلي والروبوتات", "الدوائر والأنظمة المدمجة", "حساسات وميكانيكا دقيقة", "برمجة المتحكمات Microcontrollers"]
  },
  {
    id: "ARCHITECTURE",
    name: "الهندسة المعمارية والتصميم",
    shortName: "معماري",
    badge: "Architecture & Design",
    icon: "Compass",
    gradient: "from-emerald-500/20 via-teal-600/20 to-cyan-600/30",
    border: "border-emerald-500/40 hover:border-emerald-400",
    glow: "shadow-emerald-500/20",
    tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    description: "التصميم والتخطيط المعماري، الإظهار الرقمي وتقنيات الـ BIM، نظريات وتاريخ العمارة، وتكنولوجيا المباني.",
    focusAreas: ["التصميم المعماري الإبداعي", "الإظهار والنمذجة BIM", "نظريات وتاريخ العمارة", "تكنولوجيا وخامات البناء"]
  },
  {
    id: "CIVIL",
    name: "الهندسة المدنية والإنشائية",
    shortName: "مدني",
    badge: "Civil & Structural",
    icon: "Building2",
    gradient: "from-blue-600/20 via-indigo-600/20 to-purple-600/30",
    border: "border-blue-500/40 hover:border-blue-400",
    glow: "shadow-blue-500/20",
    tagColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    description: "تحليل وتصميم المنشآت الخرسانية والمعدنية، ميكانيكا التربة والأساسات، هندسة المساحة، وإدارة المشاريع.",
    focusAreas: ["تحليل إنشائي وخرسانة مسلحة", "ميكانيكا التربة والأساسات", "هندسة المساحة والطرق", "إدارة المشروعات والتشييد"]
  }
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ departments: DEPARTMENTS, currentDepartment: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { department: true }
    });

    return NextResponse.json({
      departments: DEPARTMENTS,
      currentDepartment: user?.department || null
    });
  } catch (error) {
    console.error("Department GET error:", error);
    return NextResponse.json({ error: "فشل تحميل الأقسام" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await req.json();
    const { department } = body;

    const validDept = DEPARTMENTS.find(d => d.id === department);
    if (!validDept) {
      return NextResponse.json({ error: "القسم المحدد غير صالح" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { department: validDept.id },
      select: { id: true, department: true }
    });

    return NextResponse.json({
      success: true,
      department: updatedUser.department,
      departmentInfo: validDept
    });
  } catch (error) {
    console.error("Department POST error:", error);
    return NextResponse.json({ error: "فشل حفظ القسم" }, { status: 500 });
  }
}
