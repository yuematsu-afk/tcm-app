export type Pharmacist = {
  id: string;
  name: string;
  photo: string;
  url: string;
  tags: string[];
  genders: ("male"|"female"|"any")[];
  ages?: string[];
  langs?: string[];
  titles?: string[];
  bio?: string;
  area?: string;
};

export const PHARMACISTS: Pharmacist[] = [
  {
    id: "ph01",
    name: "中村 幸子（なかむら ゆきこ）",
    photo: "/pharmacists/nakamura.jpg",
    url: "https://hito-yaku.com/case/NXi-fXRl",
    tags: ["xuexu", "yinxu", "qixu"],
    genders: ["female", "any"],
    langs: ["日本語"],
    titles: ["薬剤師"],
    area: "愛知県名古屋市昭和区（草漢堂グループ｜漢方明昭堂）",
    bio: "不妊症・更年期・睡眠・肌トラブルなど、女性のライフステージに寄り添った漢方相談を30年以上実践。西洋医療経験と中医学の知識を組み合わせ、心身を整える食養生・生活養生を提案します。オンライン相談・LINE対応可。"
  },
  {
    id: "ph02",
    name: "寺田 朱花（てらだ あやか）",
    photo: "/pharmacists/terada.jpg",
    url: "https://hito-yaku.com/case/CdHcL5Aj",
    tags: ["qixu", "xuexu", "qitai"], // 気虚・血虚・気滞傾向
    genders: ["female", "any"],
    langs: ["日本語"],
    titles: ["登録販売者", "中医薬膳師"],
    area: "愛知県刈谷市（草漢堂グループ）",
    bio: "アトピーや不眠、更年期など女性特有の悩みに寄り添う登録販売者。自身のアトピー経験を活かし、体質に合わせた薬膳・漢方相談を実施。丁寧なヒアリングと生活養生の提案が好評です。"
  },
  {
    id: "ph03",
    name: "石田 朋之（いしだ ともゆき）",
    photo: "/pharmacists/ishida.jpg",
    url: "https://hito-yaku.com/case/sNvJoCpP",
    tags: ["xuexu", "yinxu", "oketsu"], // 血虚・陰虚・瘀血傾向
    genders: ["male", "any"],
    langs: ["日本語"],
    titles: ["薬剤師"],
    area: "愛知県刈谷市（草漢堂グループ）",
    bio: "調剤薬局での勤務を経て漢方歴7年以上。西洋・東洋の両視点から、不妊症や不眠、肌トラブルなどの慢性不調に向き合う。患者に寄り添う“並走型”相談スタイルで信頼を集める。"
  },
  {
    id: "ph04",
    name: "角 裕也（すみ ゆうや）",
    photo: "/pharmacists/sumi.jpg",
    url: "https://hito-yaku.com/case/XQWHhl1m",
    tags: ["qixu", "yangxu", "tanshi"], // 気虚・陽虚・痰湿傾向
    genders: ["male", "any"],
    langs: ["日本語"],
    titles: ["薬剤師"],
    area: "愛知県小牧市（草漢堂薬局 ほのぼの調剤）",
    bio: "薬剤師歴15年以上。草漢堂薬局で漢方相談を担当。“なんとなく不調”や慢性疲労、睡眠の悩みに寄り添い、体質に合わせたオーダーメイド処方を提案。オンライン相談も対応。"
   },
];
