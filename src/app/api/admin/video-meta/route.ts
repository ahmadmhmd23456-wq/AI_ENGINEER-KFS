import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { fetchVideoMetadata } from "@/lib/video-helper";

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await req.json();
    const { urlOrId, provider } = body;

    if (!urlOrId || typeof urlOrId !== "string" || !urlOrId.trim()) {
      return NextResponse.json({ error: "يرجى إدخال رابط أو معرف الفيديو" }, { status: 400 });
    }

    const meta = await fetchVideoMetadata(urlOrId.trim(), provider || "YOUTUBE");

    return NextResponse.json({
      success: true,
      ...meta,
    });
  } catch (error: any) {
    console.error("Video Meta Detection Error:", error);
    return NextResponse.json({ error: "تعذر جلب تفاصيل الفيديو تلقائياً" }, { status: 500 });
  }
}
