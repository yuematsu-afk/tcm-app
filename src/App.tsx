import React, { useEffect, useMemo, useState } from "react";

/**
 * 漢方の体質診断アプリ（性別＋年齢層 入口 → 32問版）
 * - React + TailwindCSS
 * - 性別: 女性 / 男性（入口で選択）
 * - 年齢層: 6段階（結果にも表示、イベント計測にも付与）
 * - 8タイプ（気虚/陽虚/血虚/陰虚/気滞/湿熱/血瘀/湿痰）
 * - 32問（各タイプ4問）、5段階評価（0〜4）
 * - 上位2タイプの組合せ結果 + ブレンドアドバイス + レーダーチャート
 * - 進捗バー、自動保存、印刷、リセット
 * - クリップボード安全コピー（フォールバック）
 */

// ========= 定数・ユーティリティ =========
const STORAGE_ANS = "tcm-answers-v3";
const STORAGE_PROFILE = "tcm-profile-v1";
const APPOINTMENT_URL = "https://timerex.net/s/info_d924_481d/ef7d1a98";

type Gender = "female" | "male";
type AgeBand = "16–24" | "25–34" | "35–44" | "45–54" | "55–64" | "65+";
type Profile = { gender: Gender | null; ageBand: AgeBand | null };
type Question = { id: number; key: ConstitutionKey; text: string };
type ConstitutionKey =
  | "qixu"   // 気虚
  | "yangxu" // 陽虚
  | "xuexu"  // 血虚
  | "yinxu"  // 陰虚
  | "qitai"  // 気滞
  | "shire"  // 湿熱
  | "oketsu" // 血瘀(瘀血)
  | "tanshi" // 湿痰
  ;

type Scores = Record<ConstitutionKey, number>;

function trackEvent(name: string, params: Record<string, any> = {}) {
  try {
    if (typeof window !== "undefined") {
      if (typeof (window as any).gtag === "function") {
        (window as any).gtag("event", name, params);
      }
      if (Array.isArray((window as any).dataLayer)) {
        (window as any).dataLayer.push({ event: name, ...params });
      }
    }
  } catch {
    // no-op
  }
}

// ========= 体質定義 =========
const CONSTITUTIONS = [
  { key: "qixu",   name: "気虚",           color: "from-amber-400 to-orange-500",
    short: "胃腸が弱く疲れやすい。風邪をひきやすい、息切れ、汗をかきやすい。",
    advice: { lifestyle: "無理に食べ過ぎない・冷飲食を控える・睡眠で回復・軽い全身運動を継続",
              diet: "お粥・温かい汁物・米/いも/豆・鶏肉・卵・なつめ・長芋・はちみつ" } },
  { key: "yangxu", name: "陽虚（腎陽虚）", color: "from-sky-400 to-blue-500",
    short: "冷え・むくみ・朝が苦手。温めると楽。夜間尿・腰膝がだるい。",
    advice: { lifestyle: "薄着を避けて保温・過労回避・十分な睡眠・朝散歩や日光浴で代謝UP",
              diet: "生姜・ねぎ・にら・シナモン・羊肉・鶏肉・エビ・温かい飲食" } },
  { key: "xuexu",  name: "血虚",           color: "from-rose-400 to-pink-500",
    short: "顔色が淡い・乾燥・爪や髪が弱い・めまい/こむら返り・月経量少ない。",
    advice: { lifestyle: "23時前就寝・目の酷使を減らす・汗のかきすぎを避ける・軽い運動",
              diet: "赤身/レバー（少量）・小松菜/ほうれん草・黒ごま・なつめ・クコの実" } },
  { key: "yinxu",  name: "陰虚",           color: "from-violet-400 to-purple-500",
    short: "喉の渇き・ほてり・寝汗・便がコロコロ。夜更かし/辛味/酒で悪化。",
    advice: { lifestyle: "夜更かし回避・長風呂/サウナし過ぎ注意・リラックス呼吸・刺激を控える",
              diet: "白きくらげ・梨・豆腐・山芋・百合根・はちみつ・潤す食材" } },
  { key: "qitai",  name: "気滞",           color: "from-lime-400 to-green-500",
    short: "イライラ・ため息・胸脇の張り・便秘傾向。ストレスで悪化。",
    advice: { lifestyle: "深呼吸・背伸び・オンオフ切替・笑う時間を作る・詰め込み過ぎない",
              diet: "柑橘・しそ・ミント・ジャスミン茶・黒酢・香味野菜" } },
  { key: "shire",  name: "湿熱",           color: "from-yellow-400 to-amber-600",
    short: "暑がり・汗かき・吹き出物・粘り便。油物/甘味/辛味/酒で悪化。",
    advice: { lifestyle: "夜更かしとこってり外食を控える・発汗後は汗を拭く・運動で発散",
              diet: "はとむぎ・苦瓜・トマト・れんこん・菊花茶・とうもろこしのひげ茶" } },
  { key: "oketsu", name: "血瘀",           color: "from-fuchsia-400 to-pink-600",
    short: "刺す痛み・肩こり・シミ/クマ・月経に塊。冷えやストレスで停滞。",
    advice: { lifestyle: "入浴/体操で巡りUP・同姿勢を避ける・喫煙NG・明るく伸びやかに",
              diet: "玉ねぎ・にんにく・青魚・ウコン・黒酢・カカオ・黒きくらげ" } },
  { key: "tanshi", name: "湿痰",           color: "from-cyan-400 to-teal-600",
    short: "むくみ・体が重い・痰/鼻づまり・食後眠い。甘い/乳製品/揚げ物で悪化。",
    advice: { lifestyle: "20分ウォーキング・就寝3時間前に食事終了・遅い夜食をやめる",
              diet: "はとむぎ・冬瓜・大根・昆布・緑豆・プーアル茶" } },
] as const;

// ========= 32問：女性 =========
const FEMALE_QUESTIONS_32: Question[] = [
  // 気虚
  { id: 1,  key: "qixu",   text: "疲れやすいと感じる" },
  { id: 2,  key: "qixu",   text: "やる気・意欲が湧かず気力が出ないことが多い" },
  { id: 3,  key: "qixu",   text: "食欲があまりない" },
  { id: 4,  key: "qixu",   text: "風邪をひきやすい／治りにくい" },
  // 血虚
  { id: 5,  key: "xuexu",  text: "皮膚が乾燥気味で艶がない" },
  { id: 6,  key: "xuexu",  text: "立ちくらみ・めまいを起こしやすい" },
  { id: 7,  key: "xuexu",  text: "動悸（ドキドキ）を感じやすい" },
  { id: 8,  key: "xuexu",  text: "（女性）経血量が少ない・以前より減った" },
  // 陰虚
  { id: 9,  key: "yinxu",  text: "夕方〜夜に体がほてりやすい" },
  { id: 10, key: "yinxu",  text: "暑くないのに寝汗をかいて目が覚めることがある" },
  { id: 11, key: "yinxu",  text: "口や喉・目・鼻が乾きやすい" },
  { id: 12, key: "yinxu",  text: "寝つきが悪い／眠りが浅い" },
  // 気滞
  { id: 13, key: "qitai",  text: "イライラしやすい／怒りっぽくなる" },
  { id: 14, key: "qitai",  text: "ついため息をよくつく" },
  { id: 15, key: "qitai",  text: "喉に詰まり感（梅核気）を感じることがある" },
  { id: 16, key: "qitai",  text: "（女性）生理前にイライラ／胸の張りなどPMSが強い" },
  // 瘀血
  { id: 17, key: "oketsu", text: "顔色がくすむ・クマが目立つ" },
  { id: 18, key: "oketsu", text: "刺すような鋭い痛みが繰り返し起こる" },
  { id: 19, key: "oketsu", text: "手足が冷える／しびれを感じやすい" },
  { id: 20, key: "oketsu", text: "あざ・シミができやすい" },
  // 痰湿
  { id: 21, key: "tanshi", text: "肌が脂っぽく、ニキビ・吹き出物が出やすい" },
  { id: 22, key: "tanshi", text: "体が重だるく、常に疲労感や重さを感じる" },
  { id: 23, key: "tanshi", text: "めまい・吐き気を起こしやすい" },
  { id: 24, key: "tanshi", text: "痰や鼻水など分泌物が多い" },
  // 湿熱
  { id: 25, key: "shire",  text: "顔や背中にニキビ・吹き出物ができやすい" },
  { id: 26, key: "shire",  text: "汗がベタつく／体臭・口臭が気になる" },
  { id: 27, key: "shire",  text: "口の中が苦く感じることがある" },
  { id: 28, key: "shire",  text: "便が粘りがちで残便感がある" },
  // 陽虚
  { id: 29, key: "yangxu", text: "寒がりで冷えを強く感じやすい" },
  { id: 30, key: "yangxu", text: "手足や下腹がいつも冷たい" },
  { id: 31, key: "yangxu", text: "トイレが近い（夜間頻尿含む）" },
  { id: 32, key: "yangxu", text: "（女性）おりものが水っぽく量が多い（透明〜無色）" },
];

// ========= 32問：男性 =========
const MALE_QUESTIONS_32: Question[] = [
  // 気虚
  { id: 1,  key: "qixu",   text: "疲れやすいと感じる" },
  { id: 2,  key: "qixu",   text: "やる気・意欲が湧かないことが多い" },
  { id: 3,  key: "qixu",   text: "少し動くと息切れしやすい" },
  { id: 4,  key: "qixu",   text: "風邪をひきやすい／治りにくい" },
  // 血虚
  { id: 5,  key: "xuexu",  text: "皮膚が乾燥気味で艶がない" },
  { id: 6,  key: "xuexu",  text: "立ちくらみ・めまいを起こしやすい" },
  { id: 7,  key: "xuexu",  text: "動悸（ドキドキ）を感じやすい" },
  { id: 8,  key: "xuexu",  text: "（男性）近頃、筋力の低下を自覚する" },
  // 陰虚
  { id: 9,  key: "yinxu",  text: "夕方〜夜に体がほてりやすい" },
  { id: 10, key: "yinxu",  text: "暑くないのに寝汗をかいて目が覚めることがある" },
  { id: 11, key: "yinxu",  text: "口や喉・目・鼻が乾きやすい" },
  { id: 12, key: "yinxu",  text: "寝つきが悪い／眠りが浅い" },
  // 気滞
  { id: 13, key: "qitai",  text: "イライラしやすい／怒りっぽい" },
  { id: 14, key: "qitai",  text: "気分が落ち込みやすい" },
  { id: 15, key: "qitai",  text: "ついため息をよくつく" },
  { id: 16, key: "qitai",  text: "お腹が張る・ガスやゲップが多い" },
  // 瘀血
  { id: 17, key: "oketsu", text: "顔色がくすむ・クマが目立つ" },
  { id: 18, key: "oketsu", text: "刺すような鋭い痛みが繰り返し起こる" },
  { id: 19, key: "oketsu", text: "手足が冷える／しびれを感じやすい" },
  { id: 20, key: "oketsu", text: "舌の色が暗紫色に見える" },
  // 痰湿
  { id: 21, key: "tanshi", text: "肌が脂っぽく、ニキビ・吹き出物が出やすい" },
  { id: 22, key: "tanshi", text: "体が重だるく、常に疲労感や重さを感じる" },
  { id: 23, key: "tanshi", text: "めまい・吐き気を起こしやすい" },
  { id: 24, key: "tanshi", text: "痰や鼻水など分泌物が多い" },
  // 湿熱
  { id: 25, key: "shire",  text: "顔や背中にニキビ・吹き出物ができやすい" },
  { id: 26, key: "shire",  text: "汗がベタつく／体臭・口臭が気になる" },
  { id: 27, key: "shire",  text: "口の中が苦く感じることがある" },
  { id: 28, key: "shire",  text: "便が粘りがちで残便感がある" },
  // 陽虚
  { id: 29, key: "yangxu", text: "寒がりで冷えを強く感じやすい" },
  { id: 30, key: "yangxu", text: "手足や下腹がいつも冷たい" },
  { id: 31, key: "yangxu", text: "トイレが近い（夜間頻尿含む）" },
  { id: 32, key: "yangxu", text: "下痢しやすい／軟便になりがち" },
];

// ========= 5段階（0〜4） =========
const LIKERT = [
  { value: 0, label: "まったくあてはまらない" },
  { value: 1, label: "あまりあてはまらない" },
  { value: 2, label: "どちらともいえない" },
  { value: 3, label: "ややあてはまる" },
  { value: 4, label: "とてもあてはまる" },
] as const;

// ========= クリップボード安全コピー =========
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

async function copyToClipboard(text: string) {
  if (text === undefined || text === null) return false;
  try {
    if (hasClipboardAPI()) {
      await (navigator as any).clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallbackへ
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok =
      (document as any).execCommand && (document as any).execCommand("copy");
    document.body.removeChild(ta);
    return !!ok;
  } catch {
    return false;
  }
}

function makeShareText(
  ranked: Array<{ name: string; score: number }>,
  profile: Profile
) {
  const lines = [
    "私の漢方体質診断（32問）",
    profile.gender ? `性別: ${profile.gender === "female" ? "女性" : "男性"}` : "",
    profile.ageBand ? `年齢層: ${profile.ageBand}` : "",
    `TOP1: ${ranked[0].name}（${ranked[0].score}点）`,
    `TOP2: ${ranked[1].name}（${ranked[1].score}点）`,
    "— スコア —",
    ...ranked.map((r) => `${r.name}: ${r.score} / 16`),
    "※ セルフケアの目安です。つらい症状は専門家へ。",
  ].filter(Boolean);
  return lines.join("\n");
}

// ========= ルート =========
export default function App() {
  const [step, setStep] = useState<0 | 1 | 2>(0); // 0: 入口, 1: 質問, 2: 結果

  const [profile, setProfile] = useState<Profile>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_PROFILE);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { gender: null, ageBand: null };
  });

  const QUESTIONS: Question[] = useMemo(() => {
    if (profile.gender === "female") return FEMALE_QUESTIONS_32;
    if (profile.gender === "male") return MALE_QUESTIONS_32;
    // 未選択時は女性版を仮で返す（UIは入口表示なので実質未使用）
    return FEMALE_QUESTIONS_32;
  }, [profile.gender]);

  // 回答（id -> 0..4）
  const [answers, setAnswers] = useState<Record<number, number | undefined>>(
    () => {
      try {
        const raw = localStorage.getItem(STORAGE_ANS);
        return raw ? JSON.parse(raw) : {};
      } catch {
        return {};
      }
    }
  );

  // 自動保存
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ANS, JSON.stringify(answers));
    } catch {}
  }, [answers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
    } catch {}
  }, [profile]);

  // 入口で「開始」を押したらリセットして質問へ
  const startQuiz = () => {
    setAnswers({});
    setStep(1);
    trackEvent("entry_start", {
      gender: profile.gender,
      ageBand: profile.ageBand,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 選択トグル（同じ値を再タップで非選択に）
  const handleSelect = (id: number, value: number) =>
    setAnswers((prev) => ({
      ...prev,
      [id]: prev[id] === value ? undefined : value,
    }));

  const resetAll = () => {
    localStorage.removeItem(STORAGE_ANS);
    localStorage.removeItem(STORAGE_PROFILE);
    setAnswers({});
    setProfile({ gender: null, ageBand: null });
    setStep(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // スコア計算
  const scores: Scores = useMemo(() => {
    const base: Scores = {
      qixu: 0, yangxu: 0, xuexu: 0, yinxu: 0, qitai: 0, shire: 0, oketsu: 0, tanshi: 0,
    };
    for (const q of QUESTIONS) {
      const v = answers[q.id];
      if (typeof v === "number") base[q.key] += v;
    }
    return base;
  }, [answers, QUESTIONS]);

  const ranked = useMemo(
    () =>
      CONSTITUTIONS.map((c) => ({
        ...c,
        score: scores[c.key as ConstitutionKey] || 0,
      })).sort((a, b) => b.score - a.score),
    [scores]
  );

  const top = ranked[0];
  const second = ranked[1];
  const comboLabel = `${top?.name ?? ""} × ${second?.name ?? ""}`;

  const total = QUESTIONS.length; // 32
  const answeredCount = useMemo(
    () => Object.keys(answers).filter((k) => answers[+k] !== undefined).length,
    [answers]
  );
  const progress = Math.round((answeredCount / total) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">漢方の体質診断（32問・性別別）</h1>
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-3 py-2 text-sm rounded-xl bg-white shadow border hover:bg-slate-50"
            >
              印刷/保存
            </button>
            <button
              onClick={resetAll}
              className="px-3 py-2 text-sm rounded-xl bg-white shadow border hover:bg-slate-50"
            >
              リセット
            </button>
          </div>
        </header>

        {/* 進捗 */}
        {step !== 0 && (
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
        )}

        {step === 0 && (
          <Entry
            profile={profile}
            setProfile={setProfile}
            onStart={startQuiz}
          />
        )}

        {step === 1 && (
          <Quiz
            questions={QUESTIONS}
            answers={answers}
            onSelect={handleSelect}
            onFinish={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <Result
            ranked={ranked as any}
            top={top as any}
            second={second as any}
            scores={scores as any}
            comboLabel={comboLabel}
            profile={profile}
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

// ========= 入口 =========
function Entry({
  profile,
  setProfile,
  onStart,
}: {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
  onStart: () => void;
}) {
  const canStart = profile.gender !== null && profile.ageBand !== null;

  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl shadow p-6 md:p-8">
      <h2 className="text-xl font-semibold mb-4">性別と年齢層を選んで診断を開始</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <div className="text-sm text-slate-600 mb-2">性別</div>
          <div className="flex gap-3">
            <button
              onClick={() => setProfile((p) => ({ ...p, gender: "female" }))}
              className={
                "px-4 py-3 rounded-xl border shadow-sm " +
                (profile.gender === "female"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white hover:bg-slate-50")
              }
              aria-pressed={profile.gender === "female"}
            >
              女性
            </button>
            <button
              onClick={() => setProfile((p) => ({ ...p, gender: "male" }))}
              className={
                "px-4 py-3 rounded-xl border shadow-sm " +
                (profile.gender === "male"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white hover:bg-slate-50")
              }
              aria-pressed={profile.gender === "male"}
            >
              男性
            </button>
          </div>
        </div>

        <div>
          <div className="text-sm text-slate-600 mb-2">年齢層</div>
          <select
            className="w-full px-3 py-3 rounded-xl border bg-white"
            value={profile.ageBand ?? ""}
            onChange={(e) =>
              setProfile((p) => ({ ...p, ageBand: e.target.value as AgeBand }))
            }
          >
            <option value="" disabled>
              選択してください
            </option>
            {["16–24", "25–34", "35–44", "45–54", "55–64", "65+"].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => {
            if (!canStart) return;
            onStart();
          }}
          disabled={!canStart}
          className={
            "px-5 py-3 rounded-xl shadow text-white " +
            (canStart ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-300")
          }
        >
          診断をはじめる
        </button>
      </div>

      <div className="mt-4 text-sm text-slate-600">
        <p>※ 回答は同じ端末・ブラウザに自動保存されます。全32問／約3分。</p>
      </div>
    </div>
  );
}

// ========= 質問（8問×4ページ） =========
function Quiz({
  questions,
  answers,
  onSelect,
  onFinish,
}: {
  questions: Question[];
  answers: Record<number, number | undefined>;
  onSelect: (id: number, value: number) => void;
  onFinish: () => void;
}) {
  const total = questions.length; // 32
  const answeredCount = Object.keys(answers).filter(
    (k) => answers[+k] !== undefined
  ).length;

  const pageSize = 8;
  const [showError, setShowError] = useState(false);
  const [page, setPage] = useState(0);
  const start = page * pageSize;
  const currentQs = questions.slice(start, start + pageSize);
  const isLast = page === Math.floor((total - 1) / pageSize);

  const canNext = currentQs.every((q) => answers[q.id] !== undefined);

  const goNext = () => {
    if (!canNext) {
      setShowError(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setShowError(false);
    if (isLast) {
      onFinish();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setPage((p) => p + 1);
      setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
    }
  };
  const goPrev = () => {
    setPage((p) => Math.max(0, p - 1));
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  return (
    <div id="questions" className="space-y-6">
      {currentQs.map((q, idx) => {
        const missing = showError && answers[q.id] === undefined;
        return (
          <div
            key={q.id}
            className={
              "bg-white rounded-2xl shadow p-5 border " +
              (missing ? "border-rose-300" : "border-transparent")
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-xs text-slate-500">
                  Q{start + idx + 1}
                </div>
                <div className="font-medium mb-2">{q.text}</div>
                <div className="flex flex-wrap gap-2">
                  {LIKERT.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => onSelect(q.id, opt.value)}
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
        <div className="text-rose-600 text-sm -mt-2 mb-2">
          ページ内のすべてに回答してください
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

// ========= 結果 =========
function Result({
  ranked,
  top,
  second,
  comboLabel,
  profile,
  onRetry,
}: {
  ranked: any[];
  top: any;
  second: any;
  scores: Scores;
  comboLabel: string;
  profile: Profile;
  onRetry: () => void;
}) {
  const [toast, setToast] = useState("");
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [fallbackText, setFallbackText] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const onCopy = async () => {
    const text = makeShareText(ranked, profile);
    const ok = await copyToClipboard(text);
    if (ok) setToast("クリップボードにコピーしました");
    else {
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
              <div className="text-sm text-slate-500 mb-1">
                あなたの設定：{profile.gender === "female" ? "女性" : "男性"} / {profile.ageBand ?? "-"}
              </div>
              <div className="text-sm text-slate-500 mb-1">あなたの体質（組合せ）</div>
              <div className="text-2xl font-bold">{comboLabel}</div>
              <p className="text-slate-700 mt-2">
                上位2タイプの特徴と養生を組み合わせて、今日から始められる具体策を提示します。
              </p>
              <div className="mt-3 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                <button
                  onClick={onRetry}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border"
                >
                  回答を見直す
                </button>
                <button
                  onClick={onCopy}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white border hover:bg-slate-50"
                >
                  結果をコピー
                </button>
                <a
                  href={APPOINTMENT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="button"
                  aria-label="漢方の専門家に無料相談する（外部リンク）"
                  onClick={() =>
                    trackEvent("consult_click", {
                      location: "result_header",
                      top1: top?.key,
                      top2: second?.key,
                      gender: profile.gender,
                      ageBand: profile.ageBand,
                    })
                  }
                  className="w-full sm:w-auto px-4 py-3 rounded-xl text-center text-white bg-emerald-600 hover:bg-emerald-700 shadow inline-flex items-center justify-center gap-2"
                >
                  無料相談（外部）
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
        <p className="text-xs text-slate-500 mt-3">
          ※ 各タイプは最大16点（4点×4問）。高いほど該当傾向が強いことを示します。
        </p>

        <div className="mt-4">
          <a
            href={APPOINTMENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            role="button"
            aria-label="漢方の専門家に無料相談する（外部リンク・スコア下）"
            onClick={() =>
              trackEvent("consult_click", {
                location: "score_section",
                top1: top?.key,
                top2: second?.key,
                gender: profile.gender,
                ageBand: profile.ageBand,
              })
            }
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

      {fallbackOpen && (
        <CopyFallbackModal text={fallbackText} onClose={() => setFallbackOpen(false)} />
      )}

      {/* モバイル固定CTA */}
      <div className="fixed inset-x-0 bottom-0 md:hidden pointer-events-none">
        <div className="p-3 pb-[calc(env(safe-area-inset-bottom,0)+12px)]">
          <a
            href={APPOINTMENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            role="button"
            aria-label="漢方の専門家に無料相談する（固定フッター）"
            onClick={() =>
              trackEvent("consult_click", {
                location: "mobile_footer",
                top1: top?.key,
                top2: second?.key,
                gender: profile.gender,
                ageBand: profile.ageBand,
              })
            }
            className="pointer-events-auto block w-full px-4 py-3 rounded-2xl text-center text-white bg-emerald-600 shadow-xl"
          >
            無料で専門家に相談する
          </a>
        </div>
      </div>
    </div>
  );
}

// ========= 付帯UI =========
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

function Badge({ constitutionKey }: { constitutionKey: ConstitutionKey }) {
  const c = CONSTITUTIONS.find((x) => x.key === constitutionKey);
  if (!c) return null;
  return (
    <div
      className={`shrink-0 rounded-xl px-3 py-2 text-xs text-white bg-gradient-to-r ${c.color}`}
      title={c.name}
    >
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
        <div className={`rounded-lg px-2 py-1 text-xs text-white bg-gradient-to-r ${item.color}`}>
          {item.name}
        </div>
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
    switch (top.key as ConstitutionKey) {
      case "qixu":
        return ["就寝/起床時刻を固定する", "朝は温かい汁物を", "歩行20分＋軽いスクワット", "間食はナッツ少量に", "夕食は腹八分・21時まで", "湯船に10分", "翌週の献立を決める"];
      case "yangxu":
        return ["朝散歩10分", "首・腹を保温", "温かい飲み物を選ぶ", "生もの控えめ", "湯船＋足先温め", "温スープを作る", "日光に当たる"];
      case "xuexu":
        return ["23時前に就寝", "目の休息タイム", "鉄/タンパクを意識", "軽いストレッチ", "甘い冷たいもの控えめ", "入浴で巡りUP", "買い出し計画"];
      case "yinxu":
        return ["夜更かししない", "白きくらげor梨を1品", "辛味・酒を控える", "深呼吸5分", "長風呂し過ぎない", "スマホ時間を整理", "早寝デーを作る"];
      case "qitai":
        return ["背伸び＆深呼吸", "柑橘orミントの飲み物", "区切り時間を決めて休む", "15分の軽運動", "寝る前に腹式呼吸", "肩まわりを緩める", "予定を詰め込みすぎない"];
      case "shire":
        return ["辛味・油・酒を控える", "はとむぎ/苦瓜を取り入れる", "汗を拭いて蒸れ防止", "睡眠を優先", "こってり外食を回避", "発酵食品を少量", "水分補給"];
      case "oketsu":
        return ["こまめに立って動く", "温かい入浴", "玉ねぎor青魚料理", "肩甲骨ストレッチ", "こまめな水分", "夜更かしを避ける", "喫煙は控える"];
      case "tanshi":
        return ["就寝3時間前に食事終了", "20分ウォーキング", "汁物＋野菜多め", "甘い粉物お休み", "乳製品/揚げ物控えめ", "寝る前スマホ減らす", "朝に白湯"];
      default:
        return ["7時間睡眠", "歩行20分", "温かい汁物", "間食控えめ", "入浴でリラックス", "スクリーンタイム調整", "翌週の予定を整える"];
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

// ========= レーダーチャート =========
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
      } catch {
        if (mounted) setErr("レーダーチャートの読み込みに失敗しました");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (err) return <div className="text-sm text-rose-600">{err}</div>;
  if (!lib) return <div className="text-sm text-slate-500">読み込み中…</div>;

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
