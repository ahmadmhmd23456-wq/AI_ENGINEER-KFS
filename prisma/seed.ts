import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🌱 Starting Database Seeding for Engineering Academy...");

  // 1. Create Academic Levels (الدفعات)
  const levelsData = [
    { name: "إعدادي هندسة", slug: "prep", order: 0 },
    { name: "المستوى الأول", slug: "level-1", order: 1 },
    { name: "المستوى الثاني", slug: "level-2", order: 2 },
    { name: "المستوى الثالث", slug: "level-3", order: 3 },
    { name: "المستوى الرابع", slug: "level-4", order: 4 },
  ];

  const levels: Record<string, any> = {};
  for (const lvl of levelsData) {
    const created = await prisma.academicLevel.upsert({
      where: { slug: lvl.slug },
      update: { name: lvl.name, order: lvl.order },
      create: lvl,
    });
    levels[lvl.slug] = created;
  }
  console.log("✅ Academic Levels created:", Object.keys(levels).length);

  // 2. Create Admin Account (المدرس والأدمن الوحيد)
  const adminEmail = process.env.ADMIN_EMAIL || "eng.teacher@gmail.com";
  const adminPhone = process.env.ADMIN_PHONE || "01012345678";

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: "ADMIN",
      status: "ACTIVE",
      name: "د. محمد المهندس (الأستاذ والأدمن)",
      phone: adminPhone,
    },
    create: {
      name: "د. محمد المهندس (الأستاذ والأدمن)",
      email: adminEmail,
      phone: adminPhone,
      role: "ADMIN",
      status: "ACTIVE",
      phoneVerified: new Date(),
      emailVerified: new Date(),
    },
  });
  console.log("✅ Admin User seeded:", adminUser.email);

  // 3. Create Demo Students (Active & Locked)
  const activeStudent = await prisma.user.upsert({
    where: { email: "ahmed.student@gmail.com" },
    update: {
      academicLevelId: levels["prep"].id,
      status: "ACTIVE",
    },
    create: {
      name: "أحمد محمود علي",
      email: "ahmed.student@gmail.com",
      phone: "01123456789",
      role: "STUDENT",
      status: "ACTIVE",
      phoneVerified: new Date(),
      emailVerified: new Date(),
      academicLevelId: levels["prep"].id,
      devices: {
        create: {
          deviceFingerprint: "device_fp_demo_student_pc_1",
          deviceName: "Chrome on Windows 11",
          ipAddress: "197.34.120.45",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          isApproved: true,
        },
      },
    },
  });

  const lockedStudent = await prisma.user.upsert({
    where: { email: "omar.hassan@gmail.com" },
    update: {
      status: "LOCKED",
    },
    create: {
      name: "عمر حسن إبراهيم",
      email: "omar.hassan@gmail.com",
      phone: "01234567890",
      role: "STUDENT",
      status: "LOCKED",
      phoneVerified: new Date(),
      academicLevelId: levels["prep"].id,
      auditLogs: {
        create: {
          action: "ACCOUNT_LOCKED",
          attemptedEmail: "unauthorized.another@gmail.com",
          attemptedFingerprint: "rogue_device_fp_unknown",
          ipAddress: "41.233.15.89",
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
          reason: "محاولة دخول مريبة: تم رصد محاولة دخول بنفس الرقم من حساب Google مختلف وجهاز جديد غير مصرح",
        },
      },
    },
  });
  console.log("✅ Demo Students seeded:", activeStudent.name, "&", lockedStudent.name);

  // 4. Create 5 Subjects for Prep Engineering (Term 1 & Term 2)
  const prepSubjects = [
    {
      name: "رياضيات هندسية 1 (تفاضل وتكامل)",
      code: "MTH-001",
      description: "شرح شامل للنهايات، التفاضل، التكامل وتطبيقاتها الهندسية المتقدمة لطلاب إعدادي.",
      price: 50.00,
      term: 1,
      order: 1,
      academicLevelId: levels["prep"].id,
    },
    {
      name: "فيزياء هندسية 1 (كهربية ومغناطيسية)",
      code: "PHY-001",
      description: "المجال الكهربي، قانون جاوس، المكثفات، المجال المغناطيسي وقانون فاراداي.",
      price: 50.00,
      term: 1,
      order: 2,
      academicLevelId: levels["prep"].id,
    },
    {
      name: "ميكانيكا هندسية (استاتيكا)",
      code: "MEC-001",
      description: "اتزان الجسيمات والأجسام الجاسئة، عزم القوى، الجمالونات والاتزان المستوي والفراغي.",
      price: 50.00,
      term: 1,
      order: 3,
      academicLevelId: levels["prep"].id,
    },
    {
      name: "هندسة إنتاج وتكنولوجيا الورش",
      code: "PRD-001",
      description: "عمليات التشكيل، السباكة، اللحام، وتكنولوجيا المواد الهندسية واختباراتها.",
      price: 50.00,
      term: 1,
      order: 4,
      academicLevelId: levels["prep"].id,
    },
    {
      name: "رسم هندسي وإسقاط",
      code: "DRW-001",
      description: "قواعد الإسقاط العمودي، استنتاج المسقط الثالث، والقطاعات الهندسية والتفريد.",
      price: 50.00,
      term: 1,
      order: 5,
      academicLevelId: levels["prep"].id,
    },
  ];

  for (const sub of prepSubjects) {
    const subject = await prisma.subject.create({
      data: {
        ...sub,
        lessons: {
          create: [
            {
              title: "المحاضرة الأولى: مقدمة والمفاهيم الأساسية",
              description: "تأسيس كامل وتطبيقات وحل مسائل الشيت الأول.",
              order: 1,
              isPublished: true,
              videos: {
                create: {
                  title: "فيديو المحاضرة الأولى (جودة عالية HLS)",
                  provider: "BUNNY",
                  videoId: "demo-video-id-101",
                  durationSeconds: 3600,
                  isPreviewFree: false,
                },
              },
              files: {
                create: {
                  title: "شيت المحاضرة وملخص القوانين.pdf",
                  s3Key: "prep/mth/lecture1_summary.pdf",
                  fileSize: 2048500,
                  fileType: "application/pdf",
                  isPreviewFree: false,
                },
              },
            },
            {
              title: "المحاضرة الثانية: تطبيقات متقدمة وأفكار امتحانات السنين السابقة",
              description: "أصعب مسائل الكويزات وامتحانات الميدتيرم السابقة بالخطوات.",
              order: 2,
              isPublished: true,
              videos: {
                create: {
                  title: "فيديو المحاضرة الثانية",
                  provider: "BUNNY",
                  videoId: "demo-video-id-102",
                  durationSeconds: 4200,
                },
              },
              files: {
                create: {
                  title: "شيت المسائل المحلولة كاملاً.pdf",
                  s3Key: "prep/mth/lecture2_solved.pdf",
                  fileSize: 3100000,
                  fileType: "application/pdf",
                },
              },
            },
          ],
        },
        // بنك الأسئلة (Question Bank)
        questions: {
          create: [
            {
              type: "MCQ",
              text: "ما هي قيمة نهاية: lim (x -> 0) [sin(3x) / x] ؟",
              options: [
                { id: "A", text: "0", isCorrect: false },
                { id: "B", text: "1", isCorrect: false },
                { id: "C", text: "3", isCorrect: true },
                { id: "D", text: "غير معرّفة", isCorrect: false },
              ],
              correctAnswer: "C",
              points: 2.00,
              explanation: "باستخدام قاعدة النهايات للمثلثات: lim (x->0) [sin(ax)/x] = a، وبالتالي القيمة = 3.",
            },
            {
              type: "MCQ",
              text: "تكامل الدالة f(x) = e^(2x) بالنسبة لـ x يساوي:",
              options: [
                { id: "A", text: "2 e^(2x) + C", isCorrect: false },
                { id: "B", text: "(1/2) e^(2x) + C", isCorrect: true },
                { id: "C", text: "e^(2x) + C", isCorrect: false },
                { id: "D", text: "x e^(2x) + C", isCorrect: false },
              ],
              correctAnswer: "B",
              points: 2.00,
              explanation: "تكامل الدالة الأسية مقسوماً على معامل x في الأس، أي (1/2) e^(2x) + C.",
            },
            {
              type: "TRUE_FALSE",
              text: "عزم القوة حول نقطة تقع على خط عمل القوة دائماً يساوي صفراً.",
              options: [
                { id: "TRUE", text: "صح", isCorrect: true },
                { id: "FALSE", text: "خطأ", isCorrect: false },
              ],
              correctAnswer: "TRUE",
              points: 1.00,
              explanation: "لأن المسافة العمودية بين خط عمل القوة ونقطة العزم تساوي صفراً.",
            },
            {
              type: "MCQ",
              text: "وحدة قياس شدة المجال الكهربي في النظام الدولي (SI) هي:",
              options: [
                { id: "A", text: "Joule (J)", isCorrect: false },
                { id: "B", text: "Newton / Coulomb (N/C)", isCorrect: true },
                { id: "C", text: "Volt . meter (V.m)", isCorrect: false },
                { id: "D", text: "Coulomb / meter (C/m)", isCorrect: false },
              ],
              correctAnswer: "B",
              points: 2.00,
              explanation: "المجال الكهربي E = F/q بوحدة نيوتن لكل كولوم N/C أو فولت لكل متر V/m.",
            },
          ],
        },
      },
    });

    // إنشاء امتحان تجريبي للمادة الأولى
    if (sub.code === "MTH-001") {
      const now = new Date();
      const startWindow = new Date(now.getTime() - 1000 * 60 * 5); // بدأت من 5 دقائق
      const endWindow = new Date(now.getTime() + 1000 * 60 * 60 * 48); // متاحة لمدة 48 ساعة للتجربة

      await prisma.exam.create({
        data: {
          subjectId: subject.id,
          title: "امتحان الميدتيرم التجريبي - رياضيات 1",
          description: "امتحان محدد الوقت، محاولة واحدة فقط، يتم توزيع الأسئلة عشوائياً لكل طالب.",
          durationMinutes: 20,
          totalMarks: 10,
          passMarks: 5,
          questionsToSelect: 3, // اختيار 3 أسئلة عشوائية من بنك الأسئلة
          windowStartTime: startWindow,
          windowEndTime: endWindow,
          showAnswersPolicy: "AFTER_WINDOW_CLOSES",
          isPublished: true,
        },
      });

      // شراء تجريبي للمادة للطالب أحمد
      await prisma.purchase.create({
        data: {
          userId: activeStudent.id,
          subjectId: subject.id,
          amount: 50.00,
          status: "COMPLETED",
          paymentMethod: "WALLET",
          paymentGateway: "PAYMOB",
          transactionId: "TRX_DEMO_998877",
          gatewayOrderId: "ORD_PAYMOB_5544",
        },
      });
    }
  }

  console.log("✅ 5 Subjects seeded with lessons, questions, and demo exam!");
  console.log("🚀 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
