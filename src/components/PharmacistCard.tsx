import { CONSTITUTION_COLOR, tagToLabel } from "../ui/constitution";

export type Pharmacist = {
  id: string;
  name: string;
  photo?: string;
  url?: string;
  tags?: string[];            // ["qixu","xuexu",...]
  genders?: ("male"|"female"|"any")[];
  langs?: string[];           // ["日本語","英語"]
  titles?: string[];          // ["薬剤師","国際中医専門員"]
  area?: string;              // "オンライン／京都" など
  bio?: string;
};

type Props = { data: Pharmacist };

export default function PharmacistCard({ data }: Props) {
  const { name, photo, url, tags = [], langs = [], titles = [], area, bio } = data;

  return (
    <article
      className="
        group relative overflow-hidden rounded-2xl border bg-white shadow-sm
        transition hover:shadow-lg hover:-translate-y-0.5
      "
    >
      {/* 上部：写真 + 名前 */}
      <div className="p-5 pb-0 flex items-start gap-4">
        {/* アバター（丸・枠リング・フォールバック） */}
        <div className="shrink-0 relative">
          <div className="
            size-20 rounded-full overflow-hidden ring-2 ring-white
            outline outline-1 outline-slate-200
            shadow-sm bg-slate-100
          ">
            <img
              src={photo || "/pharmacists/placeholder.jpg"}
              alt={`${name}の写真`}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/pharmacists/placeholder.jpg";
              }}
              loading="lazy"
            />
          </div>
        </div>

        {/* 名前・肩書き */}
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900 leading-tight">
            {name}
          </h3>
          {titles.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {titles.map((t, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 text-xs px-2 py-1"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {(area || langs.length > 0) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {area && <span className="px-2 py-1 rounded bg-slate-50 border">{area}</span>}
              {langs.length > 0 && (
                <span className="px-2 py-1 rounded bg-slate-50 border">
                  {langs.join(" / ")}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 中部：自己紹介（2行で省略） */}
      {bio && (
        <p className="px-5 mt-4 line-clamp-2 text-sm text-slate-700">
          {bio}
        </p>
      )}

      {/* タグ（体質） */}
      {tags.length > 0 && (
        <div className="px-5 mt-4 flex flex-wrap gap-1.5">
          {tags.map((tag, i) => {
            const c = CONSTITUTION_COLOR[tag] ?? { pill: "bg-slate-200 text-slate-800", soft: "" };
            return (
              <span
                key={`${tag}-${i}`}
                className={`inline-flex items-center rounded-full ${c.pill} text-xs px-2 py-1`}
                title={tagToLabel(tag)}
              >
                {tagToLabel(tag)}
              </span>
            );
          })}
        </div>
      )}

      {/* 下部：CTA */}
      <div className="p-5 pt-4">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="
              inline-flex items-center justify-center w-full
              rounded-xl bg-emerald-600 text-white text-sm font-medium
              px-4 py-3 shadow-sm
              hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/60
              transition
            "
            aria-label={`${name}に相談する（外部リンク）`}
          >
            詳細ページはこちら
            <svg className="ml-2 h-4 w-4 opacity-90" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M12.293 2.293a1 1 0 011.414 0l4 4A1 1 0 0117 8h-3a1 1 0 110-2h.586L12 3.414A1 1 0 0112.293 2.293z" />
              <path d="M5 4a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-5a1 1 0 112 0v5a4 4 0 01-4 4H5a4 4 0 01-4-4V6a4 4 0 014-4h5a1 1 0 110 2H5z" />
            </svg>
          </a>
        ) : (
          <div className="text-xs text-slate-500">近日中に予約ページを公開予定です。</div>
        )}
      </div>

      {/* 装飾：右上に淡いグラデ粒（控えめ） */}
      <div className="pointer-events-none absolute -top-10 -right-10 size-24 rounded-full bg-emerald-100 opacity-50 blur-2xl" />
    </article>
  );
}
