// src/components/PharmacistGrid.tsx
import React, { useMemo } from "react";
import PharmacistCard from "./PharmacistCard";
import type { Pharmacist } from "../data/pharmacists";

type Props = {
  pharmacists: Pharmacist[];
  matchedTags?: string[]; // 上位タイプ（例: ["qixu","yinxu"]）を渡すと、タグ一致順で並ぶ
  title?: string;
  subtitle?: string;
  max?: number; // 表示上限（省略可）
};

export default function PharmacistGrid({
  pharmacists,
  matchedTags = [],
  title = "あなたに合いそうな薬剤師",
  subtitle = "診断結果（上位タイプ）と得意分野のタグが近い順に表示しています。",
  max = 6,
}: Props) {
  const list = useMemo(() => {
    if (!Array.isArray(pharmacists)) return [];
    const tags = (matchedTags || []).filter(Boolean);

    // タグ一致数でスコア付けして降順ソート
    const scored = pharmacists.map((p) => {
      const pTags = p.tags || [];
      const score = tags.reduce((acc, t) => (pTags.includes(t) ? acc + 1 : acc), 0);
      return { item: p, score };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;   // 一致数が多い順
      return (a.item.name || "").localeCompare(b.item.name || ""); // 名前昇順で安定化
    });

    return scored.map((s) => s.item).slice(0, max);
  }, [pharmacists, matchedTags, max]);

  if (!list.length) {
    return (
      <div className="rounded-2xl border bg-white p-6">
        <div className="text-lg font-semibold mb-1">{title}</div>
        <p className="text-sm text-slate-600 mb-4">{subtitle}</p>
        <div className="text-sm text-slate-500">該当する薬剤師が見つかりませんでした。</div>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border bg-white p-6">
      <div className="flex items-end justify-between gap-3 mb-4">
        <div>
          <div className="text-lg font-semibold">{title}</div>
          <p className="text-sm text-slate-600">{subtitle}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((ph) => (
          <PharmacistCard key={ph.id} data={ph} />
        ))}
      </div>
    </section>
  );
}
