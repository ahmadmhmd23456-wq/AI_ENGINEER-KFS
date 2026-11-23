"use client";

export interface DeviceInfo {
  fingerprint: string;
  deviceName: string;
  deviceModel: string;
}

/**
 * دالة استخراج وتوليد بصمة الجهاز الفريدة ونوع/موديل الهاتف:
 * تكتشف نوع الفون بدقة (e.g. iPhone 14 Pro, Samsung Galaxy, Xiaomi Redmi, OPPO)
 * وتولد بصمة ثابتة تجمع خصائص العتاد والشاشة لمنع تداول الحسابات.
 */
export async function getDeviceFingerprint(): Promise<DeviceInfo> {
  if (typeof window === "undefined") {
    return { fingerprint: "server-side-unknown", deviceName: "Unknown", deviceModel: "Unknown" };
  }

  try {
    const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Cairo";
    const language = navigator.language || "ar";
    const platform = (navigator as any).userAgentData?.platform || navigator.platform || "Unknown";
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;

    // محاولة قراءة WebGL Renderer
    let glRenderer = "generic-gl";
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || (canvas.getContext("experimental-webgl") as any);
      if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          glRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || "webgl-generic";
        }
      }
    } catch {
      glRenderer = "no-gl";
    }

    const rawString = `${screenInfo}|${timeZone}|${language}|${platform}|${hardwareConcurrency}|${glRenderer}`;

    // توليد SHA-256 Hash للبصمة
    const encoder = new TextEncoder();
    const data = encoder.encode(rawString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fingerprint = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // استخراج اسم وموديل الهاتف / الجهاز بدقة
    const ua = navigator.userAgent;
    let deviceModel = "جهاز غير محدد";
    let deviceName = "متصفح الويب";

    // 1. محاولة قراءة Client Hints في المتصفحات الحديثة
    if ((navigator as any).userAgentData?.getHighEntropyValues) {
      try {
        const hints = await (navigator as any).userAgentData.getHighEntropyValues(["model", "platformVersion"]);
        if (hints?.model && hints.model.trim() !== "") {
          deviceModel = hints.model.trim();
        }
      } catch (e) {}
    }

    // 2. فحص User Agent إذا لم يتوفر Client Hints
    if (deviceModel === "جهاز غير محدد") {
      if (/iPhone/i.test(ua)) {
        deviceName = "Apple iPhone";
        const w = window.screen.width;
        const h = window.screen.height;
        if ((w === 430 && h === 932) || (w === 932 && h === 430)) deviceModel = "iPhone 14/15/16 Pro Max";
        else if ((w === 393 && h === 852) || (w === 852 && h === 393)) deviceModel = "iPhone 14/15/16 Pro";
        else if ((w === 428 && h === 926) || (w === 926 && h === 428)) deviceModel = "iPhone 12/13/14 Plus/Pro Max";
        else if ((w === 390 && h === 844) || (w === 844 && h === 390)) deviceModel = "iPhone 12/13/14";
        else if ((w === 414 && h === 896) || (w === 896 && h === 414)) deviceModel = "iPhone 11 / XR";
        else if ((w === 375 && h === 812) || (w === 812 && h === 375)) deviceModel = "iPhone X / XS / 11 Pro";
        else deviceModel = "Apple iPhone";
      } else if (/iPad/i.test(ua)) {
        deviceName = "Apple iPad";
        deviceModel = "Apple iPad";
      } else if (/Android/i.test(ua)) {
        deviceName = "هاتف Android";
        const match = ua.match(/Android[^;]+;\s*([^;)]+)/);
        if (match && match[1]) {
          let raw = match[1].trim();
          if (raw.includes("Build/")) raw = raw.split("Build/")[0].trim();
          
          if (raw.startsWith("SM-")) deviceModel = `Samsung (${raw})`;
          else if (/Redmi/i.test(raw)) deviceModel = `Xiaomi ${raw}`;
          else if (/POCO/i.test(raw)) deviceModel = `Xiaomi ${raw}`;
          else if (/CPH/i.test(raw) || /OPPO/i.test(raw)) deviceModel = `OPPO (${raw})`;
          else if (/RMX/i.test(raw) || /realme/i.test(raw)) deviceModel = `Realme (${raw})`;
          else if (/Infinix/i.test(raw)) deviceModel = `Infinix (${raw})`;
          else if (/Pixel/i.test(raw)) deviceModel = `Google ${raw}`;
          else deviceModel = raw || "هاتف محمول (Android)";
        } else {
          deviceModel = "هاتف Android";
        }
      } else if (/Windows/i.test(ua)) {
        deviceName = "جهاز كمبيوتر (Windows)";
        deviceModel = "كمبيوتر مكتبي / لابتوب (Windows)";
      } else if (/Macintosh/i.test(ua)) {
        deviceName = "جهاز Apple Mac";
        deviceModel = "Apple Mac (macOS)";
      } else if (/Linux/i.test(ua)) {
        deviceName = "جهاز Linux";
        deviceModel = "جهاز Linux";
      }
    }

    return {
      fingerprint,
      deviceName,
      deviceModel,
    };
  } catch (err) {
    console.error("فشل قراءة بصمة الجهاز:", err);
    return {
      fingerprint: "fallback-fp-" + Math.random().toString(36).substring(2),
      deviceName: "متصفح غير معروف",
      deviceModel: "جهاز غير محدد",
    };
  }
}
