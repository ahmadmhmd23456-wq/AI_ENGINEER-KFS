"use client";

import React, { useEffect, useState } from "react";
import { Volume2, VolumeX, ArrowUp } from "lucide-react";
import {
  isSoundEnabled,
  toggleSound,
  playScrollSwoosh,
  playWhoosh,
  playCyberClick,
} from "@/lib/sound";

export default function SoundController() {
  const [soundOn, setSoundOn] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    setSoundOn(isSoundEnabled());

    // Scroll listener for smooth aerodynamic cyber air-swoosh sound when scrolling down
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setShowBackToTop(currentScrollY > 250);

      if (currentScrollY > lastScrollY + 65 && currentScrollY > 60) {
        playScrollSwoosh();
        lastScrollY = currentScrollY;
      } else if (currentScrollY < lastScrollY - 65) {
        lastScrollY = currentScrollY;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleToggleSound = () => {
    const newState = toggleSound();
    setSoundOn(newState);
  };

  const scrollToTop = () => {
    playWhoosh();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col items-center gap-3">
      {/* زر العودة لأعلى الشاشة بتأثير العوم float-bob ومؤثر صوتي Whoosh */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="float-bob w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 border border-blue-400/30 transition-all hover:scale-110 active:scale-95 group"
          title="العودة لأعلى"
          aria-label="العودة لأعلى"
        >
          <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}

      {/* زر التحكم في المؤثرات الصوتية (تشغيل / كتم) */}
      <button
        onClick={handleToggleSound}
        className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-xl hover:scale-110 active:scale-95 border ${
          soundOn
            ? "bg-slate-900/90 hover:bg-slate-800 text-blue-400 border-blue-500/40 shadow-blue-500/20 eng-glow-blue"
            : "bg-slate-950/90 hover:bg-slate-900 text-slate-500 border-slate-800"
        }`}
        title={soundOn ? "المؤثرات الصوتية مفعلة (انقر للكتم)" : "المؤثرات الصوتية مكتومة (انقر للتشغيل)"}
        aria-label="تبديل الصوت"
      >
        {soundOn ? (
          <Volume2 className="w-5 h-5 text-blue-400" />
        ) : (
          <VolumeX className="w-5 h-5 text-slate-500" />
        )}
      </button>
    </div>
  );
}
