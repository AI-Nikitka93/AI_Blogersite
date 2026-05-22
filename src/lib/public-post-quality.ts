export type PublicLaunchPostLike = {
  id?: string | null;
  title?: string | null;
  source?: string | null;
  source_url?: string | null;
  source_published_at?: string | null;
  event_date?: string | null;
  observed?: string[] | null;
  inferred?: string | null;
  opinion?: string | null;
  cross_signal?: string | null;
  hypothesis?: string | null;
  reasoning?: string | null;
  telegram_text?: string | null;
  confidence?: string | null;
  category?: string | null;
};

export const PUBLIC_BLOCKED_POST_IDS = new Set([
  "8e376360-13c2-4c0e-b333-d2adf6e5d2a9",
  "7c4db3f3-5ef0-4d3a-83ed-e3aa7dc6f989",
  "cd7ef86b-10ba-49be-a074-a7133ac05388",
  "2ece4643-9a3e-45f8-9dd7-f5f249d732ac",
  "c731c5ba-6dbc-417b-9f0f-6568d9869edf",
  "679908a0-1272-4dc0-877e-f4daead2cc9a",
  "1bf0d318-2f54-4ec8-864c-ae0be8536496",
  "921bc906-85f3-4164-a6c4-ff1a66e77992",
  "b4b379db-437c-48fd-a30e-023c52b5b927",
  "6c90bb36-41e3-4112-b7c0-c5c727714f0a",
]);

const PUBLIC_POST_RISK_PATTERNS = [
  /пятую\s+подряд\s+побед/iu,
  /немедленн\w*\s+вмешательств/iu,
  /требует\s+немедленн\w*/iu,
  /необходимо\s+изменить\s+тактик/iu,
  /инвестир\w*/iu,
  /(?:^|[^\p{L}])ставк(?:а|и|ой|ам|ами|ах|у|е)(?=$|[^\p{L}])/iu,
  /коэффициент\w*/iu,
  /букмекер\w*/iu,
  /главн\w*\s+фильтр\w*\s+Миро/iu,
  /в\s+рынках\s+мне\s+мало\s+самой\s+цены/iu,
  /источник\s+здесь\s+важен\s+не\s+как\s+вывеска/iu,
  /если\s+эта\s+проверка\s+не\s+сработает/iu,
  /смысл\s+такой\s+статьи/iu,
  /такая\s+технологическая\s+новость\s+заслуживает\s+внимания/iu,
  /следующая\s+проверка\s+находится\s+в\s+повторяемости/iu,
  /источник\s+материала\s+[—-]/iu,
  /материал\s+не\s+делает\s+прогноз\s+сильнее\s+исходных\s+данных/iu,
  /если\s+в\s+исходных\s+данных\s+нет\s+масштаба/iu,
  /USD\/RUB\s+сдал,\s*USD\/BYN\s+сдал/iu,
  /в\s+фактах\s+появил[ао]?с[ья]\s+проверяем\w*\s+детал/iu,
  /сильнее\s+всего\s+здесь\s+работает\s+детал/iu,
  /такой\s+факт\s+важен/iu,
  /в\s+ленте\s+это\s+держится/iu,
  /в\s+канале\s+это\s+держится/iu,
  /опорн\w*\s+источник/iu,
  /мировая\s+запись\s+нужна/iu,
  /практическ\w*\s+ценност\w*\s+запис/iu,
  /редакционн\w*\s+каркас/iu,
  /в\s+тексте\s+остаются\s+только\s+детали/iu,
  /(?:Источник\s+фиксирует|Еще\s+одна\s+деталь\s+источника):\s*[A-Z][^.!?]{20,}\b(?:the|and|with|without|making|model|models|accuracy|throughput)\b/iu,
];

export const MARKET_ADVICE_COPY_PATTERNS = [
  /возможност[ьи]\s+для\s+вход/iu,
  /точк[аи]\s+вход/iu,
  /переоценк\w*\s+(?:портфел|позиц|капитал)/iu,
  /переориентировк\w*\s+(?:портфел|позиц|капитал)/iu,
  /сигнал\s+к\s+(?:переоценк|переориентировк)/iu,
  /(?:сократить|увеличить|держать|открывать|закрывать)\s+(?:позици|дол[юи]|сделк)/iu,
  /стоит\s+обратить\s+внимани/iu,
  /наблюдайте\s+за/iu,
] as const;

const MARKET_MACRO_CLAIM_GROUPS = [
  {
    patterns: [/экспорт\w*/iu, /выручк\w*/iu, /\bexport\w*/iu],
  },
  {
    patterns: [
      /энергопродукт\w*/iu,
      /энергоносител\w*/iu,
      /нефт\w*/iu,
      /газ\w*/iu,
      /\benergy\b/iu,
      /\boil\b/iu,
      /\bgas\b/iu,
    ],
  },
  {
    patterns: [/импорт\w*/iu, /\bimport\w*/iu],
  },
  {
    patterns: [/спрос\w*/iu, /\bdemand\b/iu],
  },
] as const;

const OBSERVED_ELLIPSIS_PATTERNS = [/…/, /\.{3}/];
const TITLE_ELLIPSIS_PATTERNS = [/…/, /\.{3}/];
const SOURCE_FRESHNESS_MAX_AGE_DAYS: Record<string, number> = {
  Sports: 4,
  Markets: 3,
  Tech: 14,
  World: 14,
};

function getPublicText(post: PublicLaunchPostLike): string {
  return [
    post.title,
    post.inferred,
    post.opinion,
    post.cross_signal,
    post.hypothesis,
    post.reasoning,
    post.telegram_text,
    ...(post.observed ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

function getPublicGeneratedText(post: PublicLaunchPostLike): string {
  return [
    post.title,
    post.inferred,
    post.opinion,
    post.cross_signal,
    post.hypothesis,
    post.reasoning,
    post.telegram_text,
  ]
    .filter(Boolean)
    .join(" ");
}

function getObservedText(post: PublicLaunchPostLike): string {
  return (post.observed ?? []).filter(Boolean).join(" ");
}

function matchesAny(value: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

function looksLikeMarketPost(post: PublicLaunchPostLike): boolean {
  const category = post.category?.trim().toLowerCase() ?? "";
  const title = post.title?.trim().toLowerCase() ?? "";

  return (
    category === "markets" ||
    title.includes("usd/") ||
    title.includes("bitcoin") ||
    title.includes("ethereum")
  );
}

function hasUnsupportedMarketMacroClaim(post: PublicLaunchPostLike): boolean {
  if (!looksLikeMarketPost(post)) {
    return false;
  }

  const generatedText = getPublicGeneratedText(post);
  const observedText = getObservedText(post);

  return MARKET_MACRO_CLAIM_GROUPS.some(
    (group) =>
      matchesAny(generatedText, group.patterns) &&
      !matchesAny(observedText, group.patterns),
  );
}

export function getPublicPostCopyBlockReason(
  post: PublicLaunchPostLike,
): string | null {
  const publicText = getPublicText(post);

  if (PUBLIC_POST_RISK_PATTERNS.some((pattern) => pattern.test(publicText))) {
    return "public post contains blocked quality-risk phrasing";
  }

  if (
    looksLikeMarketPost(post) &&
    MARKET_ADVICE_COPY_PATTERNS.some((pattern) => pattern.test(publicText))
  ) {
    return "public market post contains advice-like copy";
  }

  if (hasUnsupportedMarketMacroClaim(post)) {
    return "public market post contains unsupported macro claim";
  }

  return null;
}

export function getPublicPostBlockReason(
  post: PublicLaunchPostLike,
): string | null {
  if (post.id && PUBLIC_BLOCKED_POST_IDS.has(post.id)) {
    return "public post is explicitly blocked";
  }

  if (!post.source?.trim()) {
    return "public post has no source";
  }

  if (post.confidence === "low") {
    return "public post has low confidence";
  }

  if (
    post.title &&
    TITLE_ELLIPSIS_PATTERNS.some((pattern) => pattern.test(post.title ?? ""))
  ) {
    return "public post has truncated title";
  }

  if (
    (post.observed ?? []).some((fact) =>
      OBSERVED_ELLIPSIS_PATTERNS.some((pattern) => pattern.test(fact)),
    )
  ) {
    return "public post has truncated observed facts";
  }

  const copyBlockReason = getPublicPostCopyBlockReason(post);
  if (copyBlockReason) {
    return copyBlockReason;
  }

  return null;
}

function parseSourceDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function getPrePublishSourceBlockReason(
  post: PublicLaunchPostLike,
  now = new Date(),
): string | null {
  if (!post.source_url?.trim()) {
    return "pre-publish source gate blocked post without source_url";
  }

  const sourceDate =
    parseSourceDate(post.source_published_at) ?? parseSourceDate(post.event_date);
  if (!sourceDate) {
    return "pre-publish source gate blocked post without source_published_at or event_date";
  }

  const maxAgeDays =
    SOURCE_FRESHNESS_MAX_AGE_DAYS[post.category?.trim() ?? ""] ?? 7;
  const ageMs = now.getTime() - sourceDate.getTime();
  const futureToleranceMs = 36 * 60 * 60 * 1000;

  if (ageMs < -futureToleranceMs) {
    return "pre-publish source gate blocked future-dated source metadata";
  }

  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  if (ageDays > maxAgeDays) {
    return `pre-publish source gate blocked stale source metadata: ${ageDays.toFixed(1)} days old`;
  }

  return null;
}

export function isPublicLaunchPostContent(post: PublicLaunchPostLike): boolean {
  return getPublicPostBlockReason(post) === null;
}
