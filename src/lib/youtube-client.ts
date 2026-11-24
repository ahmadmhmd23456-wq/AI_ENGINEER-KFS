declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
    __ytApiPromise?: Promise<any>;
  }
}

function loadYouTubeIframeAPI(): Promise<any> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (window.__ytApiPromise) return window.__ytApiPromise;

  window.__ytApiPromise = new Promise((resolve) => {
    const existingReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof existingReady === "function") existingReady();
      resolve(window.YT);
    };

    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existingScript) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      document.head.appendChild(tag);
    }

    const poll = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(poll);
        resolve(window.YT);
      }
    }, 100);

    setTimeout(() => {
      clearInterval(poll);
      resolve(window.YT || null);
    }, 7000);
  });

  return window.__ytApiPromise;
}

/**
 * قراءة مدة فيديو يوتيوب مباشرة عبر متصفح المستخدم باستخدام YouTube IFrame API
 * لتجنب حظر خوادم السحابة من قِبل يوتيوب
 */
export async function probeYoutubeDurationClient(ytId: string): Promise<number | null> {
  if (typeof window === "undefined" || !ytId) return null;

  const YT = await loadYouTubeIframeAPI();
  if (!YT || !YT.Player) return null;

  return new Promise((resolve) => {
    const container = document.createElement("div");
    container.style.cssText =
      "position:fixed;left:-9999px;top:-9999px;width:2px;height:2px;opacity:0;pointer-events:none;overflow:hidden;";
    const target = document.createElement("div");
    container.appendChild(target);
    document.body.appendChild(container);

    let settled = false;
    let player: any = null;

    const cleanup = (result: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      try {
        player?.destroy?.();
      } catch {
        // تجاهل
      }
      try {
        container.remove();
      } catch {
        // تجاهل
      }
      resolve(result);
    };

    const timeoutId = setTimeout(() => cleanup(null), 8000);

    try {
      player = new YT.Player(target, {
        videoId: ytId,
        width: 2,
        height: 2,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (event: any) => {
            try {
              const duration = Math.round(Number(event?.target?.getDuration?.() || 0));
              if (duration > 0) {
                cleanup(duration);
                return;
              }
              setTimeout(() => {
                try {
                  const d2 = Math.round(Number(event?.target?.getDuration?.() || 0));
                  cleanup(d2 > 0 ? d2 : null);
                } catch {
                  cleanup(null);
                }
              }, 350);
            } catch {
              cleanup(null);
            }
          },
          onError: () => cleanup(null),
        },
      });
    } catch {
      cleanup(null);
    }
  });
}
