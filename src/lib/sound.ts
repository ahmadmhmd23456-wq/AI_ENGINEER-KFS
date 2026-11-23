// Web Audio API & Media Sound Engine for Engineering Academy
// Plays authentic sound effects (Swoosh, Reveal, Clicks, Hovers, Success) identical to The Castle of Fox

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

// Preloaded AudioBuffer cache for zero-latency instant playback
const bufferCache: Record<string, AudioBuffer | undefined> = {};
const loadingPromises: Record<string, Promise<AudioBuffer | null> | undefined> = {};

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function unlockAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  } catch (e) {}
}

// Automatically unlock audio and preload key sounds on first user interaction anywhere
if (typeof window !== "undefined") {
  const unlockEvents = ["scroll", "wheel", "touchstart", "click", "keydown", "mousemove"];
  const unlock = () => {
    unlockAudio();
    // Preload audio files as soon as user first interacts
    preloadSound("/sounds/fox_reveal.wav");
    preloadSound("/sounds/fox_swoosh.wav");
    preloadSound("/sounds/fox_heavy_reveal.wav");
    unlockEvents.forEach((ev) => window.removeEventListener(ev, unlock));
  };
  unlockEvents.forEach((ev) => window.addEventListener(ev, unlock, { passive: true, once: true }));
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const saved = localStorage.getItem("eng_sound_enabled");
  return saved !== null ? saved === "true" : true;
}

export function toggleSound(): boolean {
  soundEnabled = !isSoundEnabled();
  if (typeof window !== "undefined") {
    localStorage.setItem("eng_sound_enabled", String(soundEnabled));
  }
  if (soundEnabled) {
    playCyberClick();
  }
  return soundEnabled;
}

/**
 * Preload and decode an audio buffer into memory for instant zero-latency playback
 */
export async function preloadSound(url: string): Promise<AudioBuffer | null> {
  if (typeof window === "undefined") return null;
  if (bufferCache[url]) return bufferCache[url];
  if (loadingPromises[url]) return loadingPromises[url];

  loadingPromises[url] = (async () => {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const ctx = getAudioContext();
      if (!ctx) return null;
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
      bufferCache[url] = decodedBuffer;
      return decodedBuffer;
    } catch (err) {
      return null;
    }
  })();

  return loadingPromises[url];
}

/**
 * Play an audio file with zero latency via Web Audio API, falling back to HTML5 Audio
 */
export function playVideoSound(url: string, volume: number = 0.85): void {
  if (!isSoundEnabled()) return;
  if (typeof window === "undefined") return;

  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const cachedBuffer = bufferCache[url];
    if (ctx && cachedBuffer) {
      // Instant zero-latency Web Audio API playback
      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      source.buffer = cachedBuffer;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);
    } else {
      // Fallback to HTML5 Audio element if buffer not decoded yet
      const audio = new Audio(url);
      audio.volume = Math.min(Math.max(volume, 0), 1);
      audio.play().catch(() => {});

      // Trigger preload for subsequent plays
      preloadSound(url);
    }
  } catch (e) {
    try {
      const audio = new Audio(url);
      audio.volume = Math.min(Math.max(volume, 0), 1);
      audio.play().catch(() => {});
    } catch (err) {}
  }
}

// 1. Futuristic Cyber Hover Sound (Soft high-frequency chirp)
export function playCyberHover() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {}
}

// 2. Futuristic Cyber Click Sound (Mechanical high-tech trigger)
export function playCyberClick() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(450, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {}
}

// 3. Cinematic Bass Whoosh (Section navigation / drawer open)
export function playWhoosh() {
  if (!isSoundEnabled()) return;
  playVideoSound("/sounds/fox_swoosh.wav", 0.7);
}

// 4. 🔥 EXACT VIDEO AUDIO: Course Entrance & Section Reveal Sound
// Plays the genuine high-impact sound effect extracted directly from the video!
export function playCourseRevealSound() {
  if (!isSoundEnabled()) return;
  playVideoSound("/sounds/fox_reveal.wav", 0.9);
}

// 5. 🔥 EXACT VIDEO AUDIO: Scroll Air-Swoosh Sound
// Plays the authentic aerodynamic whoosh when scrolling down
let lastScrollSoundTime = 0;
export function playScrollSwoosh() {
  if (!isSoundEnabled()) return;
  const nowMs = Date.now();
  if (nowMs - lastScrollSoundTime < 650) return; // Debounce for clean feel
  lastScrollSoundTime = nowMs;

  playVideoSound("/sounds/fox_swoosh.wav", 0.65);
}

// 6. Tactical Target Lock / Beep (For card selection / exams)
export function playTargetLock() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    [0, 0.06].forEach((delay, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(1200 + idx * 400, now + delay);

      gain.gain.setValueAtTime(0.07, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.04);
    });
  } catch (e) {}
}

// 7. Success / Level-Up Chime (Payment confirm / Exam Pass)
export function playSuccessChime() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0.1, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.3);
    });
  } catch (e) {}
}
