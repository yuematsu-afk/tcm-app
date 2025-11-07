// src/ui/constitution.ts
export const CONSTITUTION_LABEL: Record<string, string> = {
  qixu: "気虚",
  xuexu: "血虚",
  yinxu: "陰虚",
  yangxu: "陽虚",
  qitai: "気滞",
  oketsu: "瘀血",
  tanshi: "痰湿",
  shire: "湿熱",
};

export const CONSTITUTION_COLOR: Record<
  string,
  // Tailwind の bg/gradient/text 用ユーティリティ（暗い背景に白文字）
  { pill: string; soft: string }
> = {
  qixu:  { pill: "bg-amber-500 text-white",           soft: "bg-amber-50 text-amber-700" },
  xuexu: { pill: "bg-rose-500 text-white",            soft: "bg-rose-50 text-rose-700" },
  yinxu: { pill: "bg-violet-500 text-white",          soft: "bg-violet-50 text-violet-700" },
  yangxu:{ pill: "bg-sky-500 text-white",             soft: "bg-sky-50 text-sky-700" },
  qitai: { pill: "bg-lime-600 text-white",            soft: "bg-lime-50 text-lime-700" },
  oketsu:{ pill: "bg-fuchsia-600 text-white",         soft: "bg-fuchsia-50 text-fuchsia-700" },
  tanshi:{ pill: "bg-teal-600 text-white",            soft: "bg-teal-50 text-teal-700" },
  shire: { pill: "bg-amber-700 text-white",           soft: "bg-amber-50 text-amber-800" },
};

export function tagToLabel(tag: string) {
  return CONSTITUTION_LABEL[tag] ?? tag;
}
