// src/questions32.ts

export type ConstitutionKey =
  | "qixu"   // 気虚
  | "yangxu" // 陽虚
  | "xuexu"  // 血虚
  | "yinxu"  // 陰虚
  | "qitai"  // 気滞
  | "shire"  // 湿熱
  | "oketsu" // 血瘀
  | "tanshi";// 湿痰

export type Question32 = {
  id: number;
  key: ConstitutionKey;
  text: string;
  /**
   * 該当者のみ回答すればよい設問（例：月経/おりものなど）に true を付けると、
   * 未回答でもページ遷移OK（必須バリデーションから除外）になります。
   */
  optional?: boolean;
};

// ========= 32問：女性 =========
export const QUESTIONS_FEMALE: Question32[] = [
  // 気虚
  { id: 1,  key: "qixu",   text: "疲れやすいと感じる" },
  { id: 2,  key: "qixu",   text: "やる気・意欲が湧かず気力が出ないことが多い" },
  { id: 3,  key: "qixu",   text: "食欲があまりない" },
  { id: 4,  key: "qixu",   text: "風邪をひきやすい／治りにくい" },

  // 血虚
  { id: 5,  key: "xuexu",  text: "皮膚が乾燥気味で艶がない" },
  { id: 6,  key: "xuexu",  text: "立ちくらみ・めまいを起こしやすい" },
  { id: 7,  key: "xuexu",  text: "動悸（ドキドキ）を感じやすい" },
  // 月経は該当者のみ → optional
  { id: 8,  key: "xuexu",  text: "（女性）経血量が少ない・以前より減った", optional: true },

  // 陰虚
  { id: 9,  key: "yinxu",  text: "夕方〜夜に体がほてりやすい" },
  { id: 10, key: "yinxu",  text: "暑くないのに寝汗をかいて目が覚めることがある" },
  { id: 11, key: "yinxu",  text: "口や喉・目・鼻が乾きやすい" },
  { id: 12, key: "yinxu",  text: "寝つきが悪い／眠りが浅い" },

  // 気滞
  { id: 13, key: "qitai",  text: "イライラしやすい／怒りっぽくなる" },
  { id: 14, key: "qitai",  text: "ついため息をよくつく" },
  { id: 15, key: "qitai",  text: "喉に詰まり感（梅核気）を感じることがある" },
  // PMSは該当者のみ → optional
  { id: 16, key: "qitai",  text: "（女性）生理前にイライラ／胸の張りなどPMSが強い", optional: true },

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
  // おりものは該当者のみ → optional
  { id: 32, key: "yangxu", text: "（女性）おりものが水っぽく量が多い（透明〜無色）", optional: true },
];

// ========= 32問：男性 =========
export const QUESTIONS_MALE: Question32[] = [
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
