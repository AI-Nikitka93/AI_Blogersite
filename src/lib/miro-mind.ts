import type { MiroCategoryHint, MiroFactsPayload } from "./miro-connectors";

export type MiroMindTopic =
  | "sports"
  | "markets_fx"
  | "markets_crypto"
  | "tech_world"
  | "world";

export type MiroEmotionTone =
  | "cold"
  | "fascinated"
  | "uneasy"
  | "irritated"
  | "wary";

export type MiroEmotionArousal = "low" | "medium" | "high";

export type MiroEmotionCause =
  | "asymmetry"
  | "friction"
  | "delay"
  | "acceleration"
  | "stall"
  | "scale_shift"
  | "seasonal_reversal"
  | "role_shift"
  | "pressure";

export type MiroSignalStrength = "weak" | "usable" | "strong";

export interface MiroRecentThought {
  title: string;
  inferred: string;
  cross_signal?: string;
  hypothesis?: string;
  category: MiroCategoryHint;
}

export interface MiroMemoryContext {
  recent_titles: string[];
  active_motifs: string[];
  active_fascinations: string[];
  active_aversions: string[];
  recent_categories: string[];
}

export interface MiroEmotionAppraisal {
  tone: MiroEmotionTone;
  arousal: MiroEmotionArousal;
  cause: MiroEmotionCause;
  signal_strength: MiroSignalStrength;
  should_publish: boolean;
  silence_reason?: string;
  voice_notes: string[];
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeText(value: string): string {
  return normalizeWhitespace(value.toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, " "));
}

function scorePatternHits(
  text: string,
  map: ReadonlyArray<{ label: string; patterns: ReadonlyArray<RegExp> }>,
): string[] {
  const scores = map
    .map((entry) => ({
      label: entry.label,
      score: entry.patterns.reduce(
        (total, pattern) => total + (pattern.test(text) ? 1 : 0),
        0,
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return scores.map((entry) => entry.label);
}

const MOTIF_PATTERNS = [
  {
    label: "асимметрия",
    patterns: [/асимметр/i, /перекос/i, /несинхрон/i, /разной\s+скорост/i],
  },
  {
    label: "трение",
    patterns: [/трени/i, /безлимит/i, /без\s+компромисс/i, /снять\s+трени/i],
  },
  {
    label: "сдвиг масштаба",
    patterns: [/масштаб/i, /мал[а-я]+\s+сигнал/i, /сезон/i, /вош[её]л\s+в\s+кадр/i],
  },
  {
    label: "давление",
    patterns: [/давлен/i, /дожал/i, /поздний\s+гол/i, /серия/i],
  },
  {
    label: "сезонный откат",
    patterns: [/снег/i, /ветер/i, /холод/i, /фронт/i, /весн/i],
  },
  {
    label: "отставание от ритма",
    patterns: [/выпал\s+из\s+ритма/i, /отста/i, /не\s+пошел\s+за/i],
  },
] as const;

const FASCINATION_PATTERNS = [
  {
    label: "несинхронность",
    patterns: [/перекос/i, /асимметр/i, /не\s+пошел\s+за/i, /разной\s+скорост/i],
  },
  {
    label: "снятие трения",
    patterns: [/трени/i, /безлимит/i, /без\s+компромисс/i],
  },
  {
    label: "сезонный сбой",
    patterns: [/снег/i, /фронт/i, /возврат\s+холода/i],
  },
  {
    label: "позднее давление",
    patterns: [/84-?й/i, /поздний\s+гол/i, /дожал/i, /серия/i],
  },
] as const;

const AVERSION_PATTERNS = [
  {
    label: "пустая рыночная тишина",
    patterns: [/тишин/i, /пауз/i, /ровност/i, /таблиц/i, /экран/i, /координат/i],
  },
  {
    label: "синтетическая глубина",
    patterns: [/обе\s+истории/i, /их\s+объединяет/i, /что-?то\s+необычн/i],
  },
  {
    label: "служебный тон",
    patterns: [/важно\s+понимать/i, /для\s+читател/i, /базовый\s+отчет/i],
  },
] as const;

export function buildMiroMemoryContext(
  posts: ReadonlyArray<MiroRecentThought>,
): MiroMemoryContext {
  const combined = normalizeText(
    posts
      .map((post) =>
        [post.title, post.inferred, post.cross_signal ?? "", post.hypothesis ?? ""]
          .join(" "),
      )
      .join(" "),
  );

  const recentTitles = posts
    .map((post) => normalizeWhitespace(post.title))
    .filter(Boolean)
    .slice(0, 4);

  const recentCategories = posts
    .map((post) => post.category)
    .filter(Boolean)
    .slice(0, 5);

  return {
    recent_titles: recentTitles,
    active_motifs: scorePatternHits(combined, MOTIF_PATTERNS).slice(0, 3),
    active_fascinations: scorePatternHits(combined, FASCINATION_PATTERNS).slice(0, 2),
    active_aversions: scorePatternHits(combined, AVERSION_PATTERNS).slice(0, 2),
    recent_categories: recentCategories,
  };
}

function extractSignedNumbers(
  facts: string[],
  pattern: RegExp,
): number[] {
  return facts
    .map((fact) => {
      const match = fact.match(pattern);
      if (!match?.[1]) {
        return null;
      }

      const value = Number(match[1].replace(",", "."));
      return Number.isFinite(value) ? value : null;
    })
    .filter((value): value is number => value !== null);
}

function hasFactPattern(facts: string[], pattern: RegExp): boolean {
  return facts.some((fact) => pattern.test(fact));
}

function buildWorldAppraisal(facts: string[]): MiroEmotionAppraisal {
  if (hasFactPattern(facts, /\b(снег|ветер|фронт|холод|возврат холода)\b/i)) {
    return {
      tone: "uneasy",
      arousal: "medium",
      cause: "seasonal_reversal",
      signal_strength: "usable",
      should_publish: true,
      voice_notes: [
        "Be watchful, compact, and slightly tense.",
        "Name the reversal directly instead of decorating it.",
      ],
    };
  }

  if (hasFactPattern(facts, /\b(магнолия|премьер|культур|двор)\b/i)) {
    return {
      tone: "fascinated",
      arousal: "low",
      cause: "scale_shift",
      signal_strength: "usable",
      should_publish: true,
      voice_notes: [
        "Use quiet fascination.",
        "Let the detail shift the scale of the day.",
      ],
    };
  }

  return {
    tone: "cold",
    arousal: "low",
    cause: "stall",
    signal_strength: "weak",
    should_publish: false,
    silence_reason:
      "world signal stayed too flat or generic; Miro should stay silent instead of inventing weight.",
    voice_notes: [
      "If there is no real shift, do not force a mood.",
    ],
  };
}

function buildTechAppraisal(facts: string[]): MiroEmotionAppraisal {
  if (hasFactPattern(facts, /\b(безлимит|friction|без компромисс|remove friction)\b/i)) {
    return {
      tone: "fascinated",
      arousal: "low",
      cause: "friction",
      signal_strength: "strong",
      should_publish: true,
      voice_notes: [
        "Sound precise and interested, not excited.",
        "Emphasize what friction disappears from daily use.",
      ],
    };
  }

  if (hasFactPattern(facts, /\b(launch|released|presented|представил|релиз|запускает)\b/i)) {
    return {
      tone: "wary",
      arousal: "medium",
      cause: "acceleration",
      signal_strength: "usable",
      should_publish: true,
      voice_notes: [
        "Treat the launch as pressure on habits, not as a PR event.",
        "Keep the tone skeptical but alive.",
      ],
    };
  }

  return {
    tone: "cold",
    arousal: "low",
    cause: "stall",
    signal_strength: "weak",
    should_publish: false,
    silence_reason:
      "tech signal looked like a generic product update without enough pressure, friction, or habit change.",
    voice_notes: [
      "Do not hype a generic launch.",
    ],
  };
}

function buildSportsAppraisal(facts: string[]): MiroEmotionAppraisal {
  const combined = facts.join(" ");

  if (/\b(переш[её]л|переход|следующий сезон|сыграл \d+ матч)\b/i.test(combined)) {
    return {
      tone: "cold",
      arousal: "low",
      cause: "role_shift",
      signal_strength: "weak",
      should_publish: false,
      silence_reason:
        "sports signal was only a low-stakes transfer note without a real match stake or pressure line.",
      voice_notes: [
        "Do not inflate administrative sports movement into drama.",
      ],
    };
  }

  if (/\b(84-й|84th|поздний гол|дожал|серия|четвертая победа|финал)\b/i.test(combined)) {
    return {
      tone: "fascinated",
      arousal: "high",
      cause: "pressure",
      signal_strength: "strong",
      should_publish: true,
      voice_notes: [
        "Use harder verbs and stronger tempo.",
        "Name the pressure point instead of retelling the fixture.",
      ],
    };
  }

  if (/\b(счет был|match ended|обыграл|победил|won|beat)\b/i.test(combined)) {
    return {
      tone: "uneasy",
      arousal: "medium",
      cause: "pressure",
      signal_strength: "usable",
      should_publish: true,
      voice_notes: [
        "Find the hinge of the match, not just the scoreboard.",
      ],
    };
  }

  return {
    tone: "cold",
    arousal: "low",
    cause: "stall",
    signal_strength: "weak",
    should_publish: false,
    silence_reason:
      "sports input did not contain a real hinge moment, stake, or pressure line worth a post.",
    voice_notes: [
      "Stay silent on low-stakes sports noise.",
    ],
  };
}

function buildMarketsAppraisal(facts: string[]): MiroEmotionAppraisal {
  const combined = facts.join(" ");
  const cryptoMoves = extractSignedNumbers(facts, /24h move of\s*([+-]?\d+(?:[.,]\d+)?)%/i);
  const fxMoves = extractSignedNumbers(facts, /\b(?:rose|fell) by\s*([+-]?\d+(?:[.,]\d+)?)/i);
  const mixedCrypto =
    cryptoMoves.some((value) => value >= 1) &&
    cryptoMoves.some((value) => value <= -0.25);
  const strongCrypto = cryptoMoves.some((value) => Math.abs(value) >= 2);
  const strongFx = fxMoves.some((value) => Math.abs(value) >= 0.2);

  if (/\boutperformed\b/i.test(combined) || mixedCrypto) {
    return {
      tone: "uneasy",
      arousal: "medium",
      cause: "asymmetry",
      signal_strength: "strong",
      should_publish: true,
      voice_notes: [
        "Focus on the asset or pair that broke rank.",
        "Sound watchful, not philosophical.",
      ],
    };
  }

  if (strongCrypto || strongFx) {
    return {
      tone: "wary",
      arousal: "medium",
      cause: "acceleration",
      signal_strength: "usable",
      should_publish: true,
      voice_notes: [
        "Treat the move as pressure, not as a mood piece.",
      ],
    };
  }

  return {
    tone: "cold",
    arousal: "low",
    cause: "stall",
    signal_strength: "weak",
    should_publish: false,
    silence_reason:
      "market input was a flat snapshot without enough divergence, acceleration, or pressure.",
    voice_notes: [
      "Do not turn a flat screen into fake tension.",
    ],
  };
}

export function buildMiroEmotionAppraisal(
  payload: MiroFactsPayload,
  topic: MiroMindTopic,
): MiroEmotionAppraisal {
  const facts = payload.facts.map((fact) => normalizeWhitespace(fact));

  switch (topic) {
    case "markets_fx":
    case "markets_crypto":
      return buildMarketsAppraisal(facts);
    case "sports":
      return buildSportsAppraisal(facts);
    case "tech_world":
      return buildTechAppraisal(facts);
    case "world":
    default:
      return buildWorldAppraisal(facts);
  }
}

export function summarizeMemoryContext(memory: MiroMemoryContext): string {
  const parts = [
    memory.active_motifs.length
      ? `motifs=${memory.active_motifs.join(", ")}`
      : "",
    memory.active_fascinations.length
      ? `fascinations=${memory.active_fascinations.join(", ")}`
      : "",
    memory.active_aversions.length
      ? `aversions=${memory.active_aversions.join(", ")}`
      : "",
  ].filter(Boolean);

  return parts.join(" | ") || "memory=empty";
}

export function summarizeEmotionAppraisal(appraisal: MiroEmotionAppraisal): string {
  return [
    `tone=${appraisal.tone}`,
    `arousal=${appraisal.arousal}`,
    `cause=${appraisal.cause}`,
    `strength=${appraisal.signal_strength}`,
    appraisal.should_publish ? "publish=true" : "publish=false",
  ].join(" | ");
}

export function buildGenerationNote(
  appraisal: MiroEmotionAppraisal,
  memory: MiroMemoryContext,
): string {
  const memoryAversions = memory.active_aversions.length
    ? `Avoid falling back into these recent weak habits: ${memory.active_aversions.join(", ")}.`
    : "";
  const memoryMotifs = memory.active_motifs.length
    ? `Miro recently keeps noticing: ${memory.active_motifs.join(", ")}. Only reuse one if the current facts truly earn it.`
    : "";
  const fascinations = memory.active_fascinations.length
    ? `Recent fascinations: ${memory.active_fascinations.join(", ")}.`
    : "";

  return [
    `Current emotional tone: ${appraisal.tone}.`,
    `Arousal: ${appraisal.arousal}.`,
    `Emotion cause: ${appraisal.cause}.`,
    `Signal strength: ${appraisal.signal_strength}.`,
    ...appraisal.voice_notes,
    memoryMotifs,
    fascinations,
    memoryAversions,
    "Do not sound therapeutic, reassuring, or eager to please.",
    "Every feeling must point to a concrete cause in the facts.",
  ]
    .filter(Boolean)
    .join(" ");
}
