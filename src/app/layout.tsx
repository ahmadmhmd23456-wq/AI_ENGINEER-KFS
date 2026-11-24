import type { Metadata, Viewport } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import SessionProvider from "@/components/providers/SessionProvider";
import SoundController from "@/components/common/SoundController";
import ScrollRevealManager from "@/components/common/ScrollRevealManager";

export const metadata: Metadata = {
  title: "منصة هندسة التعليمية | المحاضرات والامتحانات التفاعلية",
  description: "المنصة التعليمية الشاملة لطلاب كلية الهندسة في مصر - محاضرات وفيديوهات مشفرة، بنوك أسئلة وامتحانات فورية.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-cairo antialiased min-h-screen bg-[#090d16] text-slate-100 selection:bg-blue-600 selection:text-white">
        <ScrollRevealManager />
        <SessionProvider>
          {children}
          <SoundController />
        </SessionProvider>
      </body>
    </html>
  );
}
