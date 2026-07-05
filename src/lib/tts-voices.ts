/** Client-safe list of available TTS voices (no server-only SDK import). */
export const AVAILABLE_VOICES = [
  { id: "tongtong", label: "Tongtong — Warm & Friendly" },
  { id: "chuichui", label: "Chuichui — Lively & Cute" },
  { id: "xiaochen", label: "Xiaochen — Steady & Professional" },
  { id: "jam", label: "Jam — British Gentleman" },
  { id: "kazi", label: "Kazi — Clear & Standard" },
  { id: "douji", label: "Douji — Natural & Fluent" },
  { id: "luodo", label: "Luodo — Expressive" },
] as const;
