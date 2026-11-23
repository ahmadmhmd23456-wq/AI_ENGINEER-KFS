"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { playScrollSwoosh } from "@/lib/sound";

export default function ScrollRevealManager() {
  const pathname = usePathname();

  useEffect(() => {
    let activeObserver: IntersectionObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    const queryItems = () => {
      return document.querySelectorAll<HTMLElement>(".fox-scroll-item, .eng-scroll-item");
    };

    const initObserver = () => {
      const items = queryItems();
      if (!items.length) return;

      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const target = entry.target as HTMLElement;
            const rect = entry.boundingClientRect;
            const isAbove = rect.top < 0;

            if (entry.isIntersecting) {
              target.classList.add("fox-in-view", "eng-in-view");
              target.classList.remove("fox-out-above", "fox-out-below", "eng-out-above", "eng-out-below");
            } else {
              target.classList.remove("fox-in-view", "eng-in-view");
              if (isAbove) {
                target.classList.add("fox-out-above", "eng-out-above");
                target.classList.remove("fox-out-below", "eng-out-below");
              } else {
                target.classList.add("fox-out-below", "eng-out-below");
                target.classList.remove("fox-out-above", "eng-out-above");
              }
            }
          });
        },
        {
          threshold: [0, 0.1],
          rootMargin: "-15px 0px -15px 0px",
        }
      );

      activeObserver = io;

      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const inViewport = rect.top < window.innerHeight - 20 && rect.bottom > 20;

        if (inViewport) {
          item.classList.add("fox-in-view", "eng-in-view");
          item.classList.remove("fox-out-above", "fox-out-below", "eng-out-above", "eng-out-below");
        } else {
          item.classList.remove("fox-in-view", "eng-in-view");
          if (rect.top < 0) {
            item.classList.add("fox-out-above", "eng-out-above");
          } else {
            item.classList.add("fox-out-below", "eng-out-below");
          }
        }

        io.observe(item);
      });
    };

    const timer = setTimeout(() => {
      initObserver();
    }, 50);

    // Watch for dynamic DOM changes (e.g. data fetching, tabs)
    mutationObserver = new MutationObserver(() => {
      if (activeObserver) {
        const items = queryItems();
        items.forEach((item) => {
          activeObserver?.observe(item);
          // Initial check for newly added element
          const rect = item.getBoundingClientRect();
          const inViewport = rect.top < window.innerHeight - 20 && rect.bottom > 20;
          if (inViewport) {
            item.classList.add("fox-in-view", "eng-in-view");
            item.classList.remove("fox-out-above", "fox-out-below", "eng-out-above", "eng-out-below");
          }
        });
      } else {
        initObserver();
      }
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });

    // Scroll listener for aerodynamic swoosh sound effect when moving screen
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const diff = Math.abs(currentScrollY - lastScrollY);
      if (diff > 80 && currentScrollY > 40) {
        playScrollSwoosh();
        lastScrollY = currentScrollY;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
      if (activeObserver) activeObserver.disconnect();
      if (mutationObserver) mutationObserver.disconnect();
    };
  }, [pathname]);

  return null;
}
