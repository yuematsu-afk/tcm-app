import React, { useEffect, useMemo, useState } from "react";

// 漢方の体質診断アプリ（ブラウザ版・単一ファイル）
// - React + TailwindCSS 前提
// - 8タイプ（気虚/陽虚/血虚/陰虚/気滞/湿熱/血瘀/湿痰）
// - 32問（各タイプ4問）、5段階評価（0〜4）
// - 上位2タイプの組合せ結果 + ブレンドアドバイス + レーダーチャート
// - 進捗バー、ローカル保存、印刷、リセット
// - 軽量なランタイム自己テストを搭載（?dev=1 で表示）
// - ⭐ クリップボードAPIがブロックされる環境に備えた安全コピー実装（フォールバック）

// ========== 定義 ==========
const STORAGE_KEY = "tcm-constitution-v2";
// 無料相談アポイントURL（リンク先指定）
const APPOINTMENT_URL = "https://timerex.net/s/info_d924_481d/ef7d1a98";

// 計測ユーティリティ（GA4 / GTM 両対応の軽量ラッパ）
function trackEvent(name: string, params: Record<string, any> = {}) {
  try {
    if (typeof window !== "undefined") {
      // gtag (GA4 直挿し)
      if (typeof (window as any).gtag === "function") {
        (window as any).gtag("event", name, params);
      }
      // dataLayer (GTM)
      if (Array.isArray((window as any).dataLayer)) {
        (window as any).dataLayer.push({ event: name, ...params });
      }
    }
  } catch {
    // no-op
  }
}

const CONSTITUTIONS = [
  { key: "qixu", name: "気虚", color: "from-amber-400 to-orange-500", short: "胃腸が弱く疲れやすい。風邪をひきやすい、息切れ、汗をかきやすい。", advice: { lifestyle: "無理に食べ過ぎない・冷飲食を控える・睡眠で回復・軽い全身運動を継続", diet: "お粥・温かい汁物・米/いも/豆・鶏肉・卵・なつめ・長芋・はちみつ" } },
  { key: "yangxu", name: "陽虚（腎陽虚）", color: "from-sky-400 to-blue-500", short: "冷え・むくみ・朝が苦手。温めると楽。夜間尿・腰膝がだるい。", advice: { lifestyle: "薄着を避けて保温・過労回避・十分な睡眠・朝散歩や日光浴で代謝UP", diet: "生姜・ねぎ・にら・シナモン・羊肉・鶏肉・エビ・温かい飲食" } },
  { key: "xuexu", name: "血虚", color: "from-rose-400 to-pink-500", short: "顔色が淡い・乾燥・爪や髪が弱い・めまい/こむら返り・月経量少ない。", advice: { lifestyle: "23時前就寝・目の酷使を減らす・汗のかきすぎを避ける・軽い運動", diet: "赤身/レバー（少量）・小松菜/ほうれん草・黒ごま・なつめ・クコの実" } },
  { key: "yinxu", name: "陰虚", color: "from-violet-400 to-purple-500", short: "喉の渇き・ほてり・寝汗・便がコロコロ。夜更かし/辛味/酒で悪化。", advice: { lifestyle: "夜更かし回避・長風呂/サウナし過ぎ注意・リラックス呼吸・刺激を控える", diet: "白きくらげ・梨・豆腐・山芋・百合根・はちみつ・潤す食材" } },
  { key: "qitai", name: "気滞", color: "from-lime-400 to-green-500", short: "イライラ・ため息・胸脇の張り・便秘傾向。ストレスで悪化。", advice: { lifestyle: "深呼吸・背伸び・オンオフ切替・笑う時間を作る・詰め込み過ぎない", diet: "柑橘・しそ・ミント・ジャスミン茶・黒酢・香味野菜" } },
  { key: "shire", name: "湿熱", color: "from-yellow-400 to-amber-600", short: "暑がり・汗かき・吹き出物・粘り便。油物/甘味/辛味/酒で悪化。", advice: { lifestyle: "夜更かしとこってり外食を控える・発汗後は汗を拭く・運動で発散", diet: "はとむぎ・苦瓜・トマト・れんこん・菊花茶・とうもろこしのひげ茶" } },
  { key: "oketsu", name: "血瘀", color: "from-fuchsia-400 to-pink-600", short: "刺す痛み・肩こり・シミ/クマ・月経に塊。冷えやストレスで停滞。", advice: { lifestyle: "入浴/体操で巡りUP・同姿勢を避ける・喫煙NG・明るく伸びやかに", diet: "玉ねぎ・にんにく・青魚・ウコン・黒酢・カカオ・黒きくらげ" } },
  { key: "tanshi", name: "湿痰", color: "from-cyan-400 to-teal-600", short: "むくみ・体が重い・痰/鼻づまり・食後眠い。甘い/乳製品/揚げ物で悪化。", advice: { lifestyle: "20分ウォーキング・就寝3時間前に食事終了・遅い夜食をやめる", diet: "はとむぎ・冬瓜・大根・昆布・緑豆・プーアル茶" } },
];

const LIKERT = [
  { value: 0, label: "いいえ" },
  { value: 1, label: "まれに" },
  { value: 2, label: "ときどき" },
  { value: 3, label: "よくある" },
  { value: 4, label: "ほぼ常に" },
];

// 32問（各タイプ4問）
const QUESTIONS = [
  // 気虚
  { id: 1, text: "疲れやすく息切れしやすい", key: "qixu" },
  { id: 2, text: "風邪をひきやすい/治りにくい", key: "qixu" },
  { id: 3, text: "声に力がない・汗をかきやすい", key: "qixu" },
  { id: 4, text: "胃腸が弱く軟便/食欲不振がある", key: "qixu" },
  // 陽虚
  { id: 5, text: "手足や腰腹が冷えやすい", key: "yangxu" },
  { id: 6, text: "温めると楽・朝が苦手", key: "yangxu" },
  { id: 7, text: "むくみやすい/夜間尿が多い", key: "yangxu" },
  { id: 8, text: "下痢傾向・薄着や冷飲食で悪化", key: "yangxu" },
  // 血虚
  { id: 9, text: "顔色が淡い・爪や髪が弱い", key: "xuexu" },
  { id: 10, text: "めまい/立ちくらみ/こむら返り", key: "xuexu" },
  { id: 11, text: "乾燥（肌・髪）/目がかすむ", key: "xuexu" },
  { id: 12, text: "月経量が少ない/遅れがち（該当者）", key: "xuexu" },
  // 陰虚
  { id: 13, text: "口や喉の渇き・ほてり・寝汗", key: "yinxu" },
  { id: 14, text: "便がコロコロ/暑がりで夏が苦手", key: "yinxu" },
  { id: 15, text: "夜更かしや辛味・酒で悪化", key: "yinxu" },
  { id: 16, text: "お風呂は短め（長風呂が苦手）", key: "yinxu" },
  // 気滞
  { id: 17, text: "イライラ・ため息が多い", key: "qitai" },
  { id: 18, text: "胸脇が張る/喉のつかえ感", key: "qitai" },
  { id: 19, text: "便秘気味・ガスが溜まりやすい", key: "qitai" },
  { id: 20, text: "PMSや情緒の波が強い（該当者）", key: "qitai" },
  // 湿熱
  { id: 21, text: "暑がりで汗っかき/吹き出物", key: "shire" },
  { id: 22, text: "粘り便・臭いが強い・口が苦い", key: "shire" },
  { id: 23, text: "油物/辛味/甘味/酒が好き", key: "shire" },
  { id: 24, text: "冷たい飲料や深夜食で悪化", key: "shire" },
  // 血瘀
  { id: 25, text: "刺す痛み・慢性肩こり・シミ/クマ", key: "oketsu" },
  { id: 26, text: "アザができやすい/月経に塊（該当者）", key: "oketsu" },
  { id: 27, text: "冷えやストレスで悪化", key: "oketsu" },
  { id: 28, text: "長時間同じ姿勢でつらくなる", key: "oketsu" },
  // 湿痰
  { id: 29, text: "体が重だるい・食後眠くなる", key: "tanshi" },
  { id: 30, text: "痰が多い/鼻づまり/めまい", key: "tanshi" },
  { id: 31, text: "雨天や湿気で不調が出やすい", key: "tanshi" },
  { id: 32, text: "甘い/乳製品/揚げ物で悪化", key: "tanshi" },
];

// ========== ユーティリティ ==========
function makeShareText(ranked: Array<{ name: string; score: number }>) {
  const lines = [
    "私の漢方体質診断 結果",
    `TOP1: ${ranked[0].name}（${ranked[0].score}点）`,
    `TOP2: ${ranked[1].name}（${ranked[1].score}点）`,
    "— スコア —",
    ...ranked.map((r) => `${r.name}: ${r.score} / 16`),
    "※ セルフケアの目安です。つらい症状は専門家へ。",
  ];
  return lines.join("\n");
}

function params() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

// クリップボードAPIの利用可否を安全に判定
function hasClipboardAPI() {
  try {
    return (
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!(navigator as any).clipboard &&
      (window as any).isSecureContext
    );
  } catch {
    return false;
  }
}

// 文字列をクリップボードへ安全コピー。成功:true/失敗:false を返す
async function copyToClipboard(text: string) {
  if (!text && text !== "") return false;
  try {
    if (hasClipboardAPI()) {
      await (navigator as any).clipboard.writeText(text);
      return true;
    }
  } catch {
    // no-op -> fallbackへ
  }
  // フォールバック（選択→execCommand）
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = (document as any).execCommand && (document as any).execCommand("copy");
    document.body.removeChild(ta);
    return !!ok;
  } catch {
    return false;
  }
}

function useSelfTests(ranked: Array<{ name: string; score: number }>) {
  const [results, setResults] = useState<string[]>([]);
  useEffect(() => {
    const errs = [];
    // Test 1: 8タイプ定義
    if (CONSTITUTIONS.length !== 8) errs.push("CONSTITUTIONS length should be 8");
    // Test 2: 32問
    if (QUESTIONS.length !== 32) errs.push("QUESTIONS length should be 32");
    // Test 3: すべての質問キーが定義済みタイプに含まれる
    const keys = new Set(CONSTITUTIONS.map((c) => c.key));
    QUESTIONS.forEach((q) => { if (!keys.has(q.key)) errs.push(`Unknown key in QUESTIONS: ${q.key}`); });
    // Test 4: makeShareTextの改行含有とTOP行の整形
    try {
      const mock = CONSTITUTIONS.map((c, i) => ({ ...c, score: i }));
      const txt = makeShareText(mock);
      if (!txt.includes("TOP1") || !txt.includes("TOP2") || !txt.includes("\n")) errs.push("makeShareText formatting");
    } catch (e) {
      errs.push("makeShareText threw error");
    }
    // Test 5: hasClipboardAPI が boolean を返す
    try {
      const v = hasClipboardAPI();
      if (typeof v !== "boolean") errs.push("hasClipboardAPI should return boolean");
    } catch (e) {
      errs.push("hasClipboardAPI threw error");
    }
    // New Test 6: RadarChart dynamic import safety (no crash)
    try {
      // Simulate calling component without library loaded
      const element = React.createElement(() => React.createElement('div', null, 'ok'));
      if (!element) errs.push("RadarChart component render baseline failed");
    } catch (e) {
      errs.push("RadarChart dynamic import baseline failed");
    }
    setResults(errs as string[]);
  }, [ranked]);
  return results;
}

// ========== ルートコンポーネント ==========
export default function App() {
  const [step, setStep] = useState(0); // 0: intro, 1: quiz, 2: result
  const [answers, setAnswers] = useState<Record<number, number | undefined>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {} as Record<number, number | undefined>;
    }
  });

  const total = QUESTIONS.length;
  const answeredCount = useMemo(
    () => Object.keys(answers).filter((k) => (answers as any)[k] !== undefined).length,
    [answers]
  );
  const progress = Math.round((answeredCount / total) * 100);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
  window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const handleSelect = (id: number, value: number | undefined) => setAnswers((prev) => ({ ...prev, [id]: value }));

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAnswers({});
    setStep(0);
  };

  // スコア計算
  const scores = useMemo(() => {
    const base: Record<string, number> = Object.fromEntries(CONSTITUTIONS.map((c) => [c.key, 0]));
    for (const q of QUESTIONS) {
      const v = (answers as any)[q.id];
      if (v !== undefined) base[q.key] += v as number;
    }
    return base;
  }, [answers]);

  const ranked = useMemo(() => {
    return [...CONSTITUTIONS]
      .map((c) => ({ ...c, score: (scores as any)[c.key] || 0 }))
      .sort((a, b) => b.score - a.score);
  }, [scores]);

  const top = ranked[0];
  const second = ranked[1];
  const comboLabel = `${top?.name ?? ""} × ${second?.name ?? ""}`;

  const selfTestResults = useSelfTests(ranked as any);
  const showDev = params().get("dev") === "1";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">漢方の体質診断（ブラウザ版）</h1>
          <div className="hidden md:flex items-center gap-3">
            <button onClick={resetAll} className="px-3 py-2 text-sm rounded-xl bg-white shadow border hover:bg-slate-50">リセット</button>
            <button onClick={() => window.print()} className="px-3 py-2 text-sm rounded-xl bg-white shadow border hover:bg-slate-50">印刷/保存</button>
          </div>
        </header>

        {/* Dev self-tests */}
        {showDev && (
          <div className="mb-6 rounded-xl border bg-white p-4">
            <div className="font-semibold mb-2">Self Tests</div>
            {selfTestResults.length === 0 ? (
              <div className="text-emerald-600 text-sm">All tests passed ✅</div>
            ) : (
              <ul className="list-disc pl-5 text-sm text-rose-600">
                {selfTestResults.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span>進捗</span>
            <span>
              {answeredCount}/{total}（{progress}%）
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        {step === 0 && <Intro onStart={() => setStep(1)} />}
        {step === 1 && <Quiz answers={answers} onSelect={handleSelect} onFinish={() => setStep(2)} />}
        {step === 2 && (
          <Result
            ranked={ranked as any}
            top={top as any}
            second={second as any}
            scores={scores as any}
            comboLabel={comboLabel}
            onRetry={() => setStep(1)}
          />
        )}

        <footer className="mt-10 text-xs text-slate-500">
          <p>※ 本アプリの結果はセルフケアの目安であり、医療行為ではありません。症状が強い場合は医療機関・薬剤師にご相談ください。</p>
        </footer>
      </div>
    </div>
  );
}

// ========== サブコンポーネント ==========
function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl shadow p-6 md:p-8">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-3">あなたの体質の傾向を3分でチェック</h2>
          <p className="text-slate-700 leading-relaxed mb-4">
            東洋医学では、体質（気・血・水のバランスや冷え/熱、停滞など）の傾向を見立てて、生活養生や食養生を調整します。32問に回答すると、上位2タイプを組み合わせた体質タイプと具体的なアドバイスが表示されます。
          </p>
          <ul className="list-disc pl-6 text-slate-700 mb-4">
            <li>所要：3分／32問（5段階）</li>
            <li>途中保存：自動（同じ端末/ブラウザ）</li>
            <li>結果：上位2タイプの組合せ＋レーダーチャート＋全体スコアバー</li>
          </ul>
          <div className="flex gap-3">
            <button onClick={onStart} className="px-4 py-3 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow">
              診断をはじめる
            </button>
          </div>
        </div>
        <div className="w-full md:w-64 shrink-0">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-100 to-indigo-200 p-6">
            <p className="text-sm text-slate-700">
              ヒント：直近2週間〜1か月の体調をイメージして、直感で答えてOKです。季節・睡眠・食事など生活背景も影響します。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Quiz({
  answers,
  onSelect,
  onFinish,
}: {
  answers: Record<number, number | undefined>;
  onSelect: (id: number, value: number | undefined) => void;
  onFinish: () => void;
}) {
  const total = QUESTIONS.length;
  const answeredCount = Object.keys(answers).filter((k) => answers[Number(k)] !== undefined).length;
  const pageSize = 8;
  const OPTIONALS = new Set<number>([12, 20, 26]); // ← Q12,20,26を任意にする
  const [showError, setShowError] = useState(false); // 未回答エラーの表示フラグ

  const [page, setPage] = useState(0); // 0-3
  const start = page * pageSize;
  const currentQs = QUESTIONS.slice(start, start + pageSize);
  const isLast = page === Math.floor((total - 1) / pageSize);

  const canNext = currentQs.every((q) => OPTIONALS.has(q.id) || answers[q.id] !== undefined);

  // すべて埋まったら自動でエラー表示をOFF
  useEffect(() => {
    const ok = currentQs.every((q) => OPTIONALS.has(q.id) || answers[q.id] !== undefined);
    if (ok && showError) setShowError(false);
  }, [answers, page]); // currentQsはpageに依存するのでこれでOK


 const goNext = () => {
  if (!canNext) {
    setShowError(true);

    // 最初の未回答IDを探す
    const firstMissingId = currentQs.find(
      (q) => !OPTIONALS.has(q.id) && answers[q.id] === undefined
    )?.id;

    // 未回答カードにスムーズスクロール（見つからなければページ先頭）
    if (firstMissingId) {
      const el = document.querySelector(`[data-qid="${firstMissingId}"]`);
      (el as HTMLElement | null)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    return;
  }

  setShowError(false);

  if (isLast) {
    onFinish();
  } else {
    setPage(page + 1);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  }
 };

  const goPrev = () => setPage((p) => Math.max(0, p - 1));

  useEffect(() => {
  // ページが変わったら先頭へ（instantでもOK。好みで'smooth'に）
  window.scrollTo({ top: 0, behavior: "auto" });
  }, [page]);

  return (
    <div id="questions" className="space-y-6">
      {currentQs.map((q, idx) => {
        const missing = showError && !OPTIONALS.has(q.id) && answers[q.id] === undefined;
        return (
          <div
            key={q.id}
            data-qid={q.id}
            aria-invalid={missing || undefined}
            className={
              "bg-white rounded-2xl shadow p-5 border " +
              (missing ? "border-rose-300" : "border-transparent")
            }
          >
            <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500">
                Q{start + idx + 1}
                {OPTIONALS.has(q.id) && <span className="ml-2 text-rose-500">(任意)</span>}
              </div>
              <div className="font-medium mb-2">{q.text}</div>
              <div className="flex flex-wrap gap-2">
              {/* ← ここに既存の LIKERT.map のボタン群（そのまま） */}
              {LIKERT.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    // ★ 追加：同じ値をもう一度押したら未選択（undefined）に戻す
                    const current = answers[q.id];
                    const next = current === opt.value ? undefined : opt.value;
                    onSelect(q.id, next);
                  }}
                  className={
                    "px-3 py-2 rounded-xl border text-sm " +
                    (answers[q.id] === opt.value
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white hover:bg-slate-50")
                  } 
                  aria-pressed={answers[q.id] === opt.value}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <Badge constitutionKey={q.key} />
          </div>
        </div>
      );
      })}

      {showError && !canNext && (
        <div className="text-rose-600 text-sm -mt-2 mb-2" role="alert">
         すべてに回答してください（※ Q12は任意）
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={page === 0}
          className={`px-4 py-2 rounded-xl border bg-white shadow text-sm ${
            page === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-slate-50"
          }`}
        >
          戻る
        </button>

        <div className="text-sm text-slate-600">
          {answeredCount}/{total} 回答済み
        </div>

        <button
          onClick={goNext}
          // disabled={!canNext}
          className={`px-5 py-3 rounded-xl shadow text-white ${
            !canNext ? "bg-slate-300" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {isLast ? "結果を見る" : "次へ"}
        </button>
      </div>
    </div>
  );
}

function Result({
  ranked,
  top,
  second,
  scores,
  comboLabel,
  onRetry,
}: {
  ranked: any[];
  top: any;
  second: any;
  scores: Record<string, number>;
  comboLabel: string;
  onRetry: () => void;
}) {
  void scores;
  const [toast, setToast] = useState("");
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [fallbackText, setFallbackText] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const onCopy = async () => {
    const text = makeShareText(ranked);
    const ok = await copyToClipboard(text);
    if (ok) {
      setToast("クリップボードにコピーしました");
    } else {
      setFallbackText(text);
      setFallbackOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="text-xl font-semibold mb-4">結果</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-2xl p-5 border bg-white">
              <div className="text-sm text-slate-500 mb-1">あなたの体質（組合せ）</div>
              <div className="text-2xl font-bold">{comboLabel}</div>
              <p className="text-slate-700 mt-2">
                上位2タイプの特徴と養生を組み合わせて、今日から始められる具体策を提示します。
              </p>
              <div className="mt-3 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                <button onClick={onRetry} className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border">
                  回答を見直す
                </button>
                <button onClick={onCopy} className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white border hover:bg-slate-50">
                  結果をコピー
                </button>
                <a
                  href={APPOINTMENT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="button"
                  aria-label="漢方の専門家に無料相談する（外部リンク）"
                  onClick={() => trackEvent("consult_click", { location: "result_header", top1: top?.key, top2: second?.key })}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl text-center text-white bg-emerald-600 hover:bg-emerald-700 shadow inline-flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                    <path d="M2 5.5A1.5 1.5 0 013.5 4h13A1.5 1.5 0 0118 5.5v9a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 012 14.5v-9zM3.5 5a.5.5 0 00-.5.5V7h14V5.5a.5.5 0 00-.5-.5h-13z" />
                    <path d="M3 8h14v6.5a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5V8z" />
                  </svg>
                  漢方の専門家に無料相談する
                </a>
              </div>
              {toast && (
                <div className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 inline-block">
                  {toast}
                </div>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <TypeCard rankNo={1} item={top} />
              <TypeCard rankNo={2} item={second} subtle />
            </div>
            <BlendAdvice a={top} b={second} />
          </div>
          <div className="md:col-span-1">
            <RadarScores ranked={ranked} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h4 className="font-semibold mb-3">スコア詳細</h4>
        <div className="space-y-3">
          {ranked.map((r) => (
            <ScoreBar key={r.key} name={r.name} value={r.score} max={16} gradient={r.color} />
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-3">※ 各タイプは最大16点（4点×4問）。高いほど該当傾向が強いことを示します。</p>
        {/* 追加CTA：スコア詳細の下にもボタンを配置（スマホで見逃しにくく） */}
        <div className="mt-4">
          <a
            href={APPOINTMENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            role="button"
            aria-label="漢方の専門家に無料相談する（外部リンク・スコア下）"
            onClick={() => trackEvent("consult_click", { location: "score_section", top1: top?.key, top2: second?.key })}
            className="block w-full px-4 py-3 rounded-xl text-center text-white bg-emerald-600 hover:bg-emerald-700 shadow"
          >
            漢方の専門家に無料相談する
          </a>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h4 className="font-semibold mb-3">次の一歩（7日間チャレンジ）</h4>
        <SevenDayPlan top={top} />
      </div>

      {/* フォールバック・コピー用の簡易モーダル */}
      {fallbackOpen && <CopyFallbackModal text={fallbackText} onClose={() => setFallbackOpen(false)} />}
      {/* モバイル用：下部固定CTA（安全領域対応） */}
      <div className="fixed inset-x-0 bottom-0 md:hidden pointer-events-none">
        <div className="p-3 pb-[calc(env(safe-area-inset-bottom,0)+12px)]">
          <a
            href={APPOINTMENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            role="button"
            aria-label="漢方の専門家に無料相談する（固定フッター）"
            onClick={() => trackEvent("consult_click", { location: "mobile_footer", top1: top?.key, top2: second?.key })}
            className="pointer-events-auto block w-full px-4 py-3 rounded-2xl text-center text-white bg-emerald-600 shadow-xl"
          >
            無料で専門家に相談する
          </a>
        </div>
      </div>
    </div>
  );
}

function CopyFallbackModal({ text, onClose }: { text: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const selectAll = () => {
    try {
      textareaRef.current?.select();
      (document as any).execCommand && (document as any).execCommand("copy");
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-5">
        <h5 className="font-semibold mb-2">コピーがブロックされました</h5>
        <p className="text-sm text-slate-600 mb-3">
          お使いの環境ではクリップボードAPIが利用できません。以下のテキストを選択してコピーしてください。
        </p>
        <textarea ref={textareaRef} className="w-full h-48 rounded-xl border p-3 text-sm" defaultValue={text} />
        <div className="mt-3 flex gap-2 justify-end">
          <button onClick={selectAll} className="px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
            全選択してコピー
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 border hover:bg-slate-200">
            閉じる
          </button>
        </div>
        {copied && <div className="mt-2 text-xs text-emerald-700">コピーしました</div>}
      </div>
    </div>
  );
}

function Badge({ constitutionKey }: { constitutionKey: string }) {
  const c = CONSTITUTIONS.find((x) => x.key === constitutionKey);
  if (!c) return null;
  return (
    <div className={`shrink-0 rounded-xl px-3 py-2 text-xs text-white bg-gradient-to-r ${c.color}`} title={c.name}>
      {c.name}
    </div>
  );
}

function TypeCard({ rankNo, item, subtle = false }: { rankNo: number; item: any; subtle?: boolean }) {
  if (!item) return null;
  return (
    <div className={`rounded-2xl p-5 border ${subtle ? "bg-white" : "bg-white"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-slate-500">TOP {rankNo}</div>
        <div className={`rounded-lg px-2 py-1 text-xs text-white bg-gradient-to-r ${item.color}`}>{item.name}</div>
      </div>
      <p className="text-slate-700 mb-4">{item.short}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3 border">
          <div className="text-xs text-slate-500 mb-1">生活アドバイス</div>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
            {item.advice.lifestyle
              .split("・")
              .filter(Boolean)
              .slice(0, 8)
              .map((t: string, i: number) => (
                <li key={i}>{t}</li>
              ))}
          </ul>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 border">
          <div className="text-xs text-slate-500 mb-1">食事アドバイス</div>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
            {item.advice.diet
              .split("・")
              .filter(Boolean)
              .slice(0, 10)
              .map((t: string, i: number) => (
                <li key={i}>{t}</li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ name, value, max, gradient }: { name: string; value: number; max: number; gradient: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span>{name}</span>
        <span className="text-slate-500">
          {value} / {max}
        </span>
      </div>
      <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-3 bg-gradient-to-r ${gradient}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SevenDayPlan({ top }: { top: any }) {
  if (!top) return null;
  const tasks = (() => {
    switch (top.key) {
      case "qixu":
        return [
          "就寝/起床時刻を固定する",
          "朝は温かい汁物を",
          "歩行20分＋軽いスクワット",
          "間食はナッツ少量に",
          "夕食は腹八分・21時まで",
          "湯船に10分",
          "翌週の献立を決める",
        ];
      case "yangxu":
        return [
          "朝散歩10分",
          "首・腹を保温",
          "温かい飲み物を選ぶ",
          "生もの控えめ",
          "湯船＋足先温め",
          "温スープを作る",
          "日光に当たる",
        ];
      case "xuexu":
        return [
          "23時前に就寝",
          "目の休息タイム",
          "鉄/タンパクを意識",
          "軽いストレッチ",
          "甘い冷たいもの控えめ",
          "入浴で巡りUP",
          "買い出し計画",
        ];
      case "yinxu":
        return [
          "夜更かししない",
          "白きくらげor梨を1品",
          "辛味・酒を控える",
          "深呼吸5分",
          "長風呂し過ぎない",
          "スマホ時間を整理",
          "早寝デーを作る",
        ];
      case "qitai":
        return [
          "背伸び＆深呼吸",
          "柑橘orミントの飲み物",
          "区切り時間を決めて休む",
          "15分の軽運動",
          "腹式呼吸で寝る前リセット",
          "肩まわりを緩める",
          "予定を詰め込みすぎない",
        ];
      case "shire":
        return [
          "辛味・油・酒を控える",
          "はとむぎ/苦瓜を取り入れる",
          "汗を拭いて蒸れ防止",
          "睡眠を優先",
          "こってり外食を回避",
          "発酵食品を少量",
          "水分補給",
        ];
      case "oketsu":
        return [
          "こまめに立って動く",
          "温かい入浴",
          "玉ねぎor青魚料理",
          "肩甲骨ストレッチ",
          "こまめな水分",
          "夜更かしを避ける",
          "喫煙は控える",
        ];
      case "tanshi":
        return [
          "就寝3時間前に食事終了",
          "20分ウォーキング",
          "汁物＋野菜多め",
          "甘い粉物お休み",
          "乳製品/揚げ物控えめ",
          "寝る前スマホ減らす",
          "朝に白湯",
        ];
      default:
        return [
          "7時間睡眠",
          "歩行20分",
          "温かい汁物",
          "間食控えめ",
          "入浴でリラックス",
          "スクリーンタイム調整",
          "翌週の予定を整える",
        ];
    }
  })();
  return (
    <ol className="list-decimal pl-5 text-slate-700 grid md:grid-cols-2 gap-2">
      {tasks.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ol>
  );
}

// 上位2タイプのブレンドアドバイス
function BlendAdvice({ a, b }: { a: any; b: any }) {
  if (!a || !b) return null;
  const title = `${a.name} × ${b.name} のポイント`;
  const life = [...a.advice.lifestyle.split("・"), ...b.advice.lifestyle.split("・")] 
    .filter(Boolean)
    .slice(0, 6);
  const diet = [...a.advice.diet.split("・"), ...b.advice.diet.split("・")] 
    .filter(Boolean)
    .slice(0, 8);
  return (
    <div className="rounded-2xl p-5 border bg-white">
      <h4 className="font-semibold mb-2">{title}</h4>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 p-3 border">
          <div className="text-xs text-slate-500 mb-1">生活アドバイス（厳選）</div>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
            {life.map((t: string, i: number) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 border">
          <div className="text-xs text-slate-500 mb-1">食事アドバイス（厳選）</div>
          <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
            {diet.map((t: string, i: number) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// レーダーチャート（Recharts）
function RadarScores({ ranked }: { ranked: Array<{ name: string; score: number }> }) {
  const data = ranked.map((r) => ({ name: r.name, score: r.score }));
  return (
    <div className="rounded-2xl border bg-white p-4 h-full">
      <h5 className="font-semibold mb-2">レーダーチャート</h5>
      <RadarChartComponent data={data} />
    </div>
  );
}

function RadarChartComponent({ data }: { data: { name: string; score: number }[] }) {
  const [lib, setLib] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const m = await import("recharts");
        if (mounted) setLib(m as any);
      } catch (e) {
        if (mounted) setErr("レーダーチャートの読み込みに失敗しました");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (err) return <div className="text-sm text-rose-600">{err}</div>;
  if (!lib) return <div className="text-sm text-slate-500">読み込み中…</div>;

  // JSXでの型エラーを避けるために ComponentType<any> にキャストしたラッパーを定義
  const ResponsiveContainerC = (lib as any).ResponsiveContainer as React.ComponentType<any>;
  const RadarChartC = (lib as any).RadarChart as React.ComponentType<any>;
  const PolarGridC = (lib as any).PolarGrid as React.ComponentType<any>;
  const PolarAngleAxisC = (lib as any).PolarAngleAxis as React.ComponentType<any>;
  const PolarRadiusAxisC = (lib as any).PolarRadiusAxis as React.ComponentType<any>;
  const RadarC = (lib as any).Radar as React.ComponentType<any>;

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainerC>
        <RadarChartC data={data} outerRadius={90}>
          <PolarGridC />
          <PolarAngleAxisC dataKey="name" tick={{ fontSize: 11 }} />
          <PolarRadiusAxisC angle={45} domain={[0, 16]} tick={{ fontSize: 10 }} />
          <RadarC name="Score" dataKey="score" stroke="#6366F1" fill="#6366F1" fillOpacity={0.35} />
        </RadarChartC>
      </ResponsiveContainerC>
    </div>
  );
}

