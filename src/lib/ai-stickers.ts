export interface AiStickerDef {
  id: string;
  emoji: string;
  label: string;
  gradient: string;
  border: string;
  textClass: string;
}

export const AI_STICKERS: AiStickerDef[] = [
  {
    id: "3ash_ya_handasa",
    emoji: "🔥",
    label: "عاش يا هندسة!",
    gradient: "from-orange-500/25 via-rose-500/20 to-amber-500/25",
    border: "border-orange-400/40",
    textClass: "text-orange-200",
  },
  {
    id: "coffee_grind",
    emoji: "☕",
    label: "شاي بالنعناع وهنفرمها",
    gradient: "from-amber-600/25 via-yellow-500/15 to-orange-700/25",
    border: "border-amber-400/40",
    textClass: "text-amber-200",
  },
  {
    id: "salute",
    emoji: "🫡",
    label: "تحت أمرك يا زميلي",
    gradient: "from-cyan-500/25 via-blue-500/20 to-indigo-500/25",
    border: "border-cyan-400/40",
    textClass: "text-cyan-200",
  },
  {
    id: "laughing",
    emoji: "😂",
    label: "فصلت ضحك والله!",
    gradient: "from-yellow-500/25 via-amber-400/20 to-lime-500/20",
    border: "border-yellow-400/40",
    textClass: "text-yellow-200",
  },
  {
    id: "hug_support",
    emoji: "🫂",
    label: "ولا يهمك، أنا في ضهرك",
    gradient: "from-emerald-500/25 via-teal-500/20 to-cyan-500/25",
    border: "border-emerald-400/40",
    textClass: "text-emerald-200",
  },
  {
    id: "mind_blown",
    emoji: "🤯",
    label: "دماغي لفت بس هنفهمها!",
    gradient: "from-fuchsia-500/25 via-purple-500/20 to-pink-500/25",
    border: "border-fuchsia-400/40",
    textClass: "text-fuchsia-200",
  },
  {
    id: "sleepy_night",
    emoji: "🌙",
    label: "سهرانين للصبح ولا إيه؟",
    gradient: "from-indigo-500/25 via-slate-700/40 to-violet-500/25",
    border: "border-indigo-400/40",
    textClass: "text-indigo-200",
  },
  {
    id: "secret_locked",
    emoji: "🤫",
    label: "سرك في بير متشفر",
    gradient: "from-violet-600/25 via-purple-600/20 to-slate-800/40",
    border: "border-violet-400/40",
    textClass: "text-violet-200",
  },
  {
    id: "exam_boss",
    emoji: "🏆",
    label: "الامتحان في الجيب!",
    gradient: "from-yellow-500/25 via-amber-500/20 to-emerald-500/20",
    border: "border-yellow-400/45",
    textClass: "text-yellow-100",
  },
  {
    id: "rocket_start",
    emoji: "🚀",
    label: "يلا بينا نبدأ!",
    gradient: "from-sky-500/25 via-cyan-500/20 to-blue-600/25",
    border: "border-sky-400/40",
    textClass: "text-sky-200",
  },
];

export const STICKER_MAP = new Map<string, AiStickerDef>(
  AI_STICKERS.map((s) => [s.id, s])
);

export const REACTION_EMOJIS = ["❤️", "😂", "🔥", "👏", "💪", "🫡", "🤯", "😢"] as const;

export function getStickerById(id?: string | null): AiStickerDef | null {
  if (!id) return null;
  return STICKER_MAP.get(id) || null;
}
