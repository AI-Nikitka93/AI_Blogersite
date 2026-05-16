import type { PostRow } from "./supabase";

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function clampText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  const sliced = value.slice(0, maxLength).trimEnd();
  const lastSpace = sliced.lastIndexOf(" ");

  return `${(lastSpace > Math.floor(maxLength * 0.6) ? sliced.slice(0, lastSpace) : sliced).trimEnd()}…`;
}

function firstSentence(value: string): string {
  const match = value.match(/[^.!?]+[.!?]/u)?.[0];
  return normalizeWhitespace(match ?? value);
}

export function splitPostParagraphs(value: string): string[] {
  return value
    .split(/\n\s*\n/g)
    .map((paragraph) => normalizeWhitespace(paragraph))
    .filter(Boolean);
}

export function getPostModeLabel(post: PostRow): string {
  if (post.hypothesis.trim()) {
    return "Разбор";
  }

  if (post.cross_signal.trim()) {
    return "Контекст";
  }

  return "Статья";
}

export function getPostOpenLabel(post: PostRow): string {
  const mode = getPostModeLabel(post);

  if (mode === "Разбор") {
    return "Читать статью";
  }

  if (mode === "Контекст") {
    return "Читать контекст";
  }

  return "Читать статью";
}

export function getPostSupportLabel(post: PostRow): string {
  const factCount = post.observed.filter((fact) => fact.trim().length > 0).length;
  const hasCrossSignal = post.cross_signal.trim().length > 0;
  const hasHypothesis = post.hypothesis.trim().length > 0;

  if (factCount <= 1 && hasHypothesis) {
    return "Один факт и осторожный вывод";
  }

  if (factCount <= 1) {
    return "Один проверенный факт";
  }

  if (hasCrossSignal && hasHypothesis) {
    return "Факты, контекст и вывод";
  }

  if (hasHypothesis) {
    return "Факты плюс осторожный вывод";
  }

  if (hasCrossSignal) {
    return "Факты плюс контекст";
  }

  return "Два подтвержденных факта";
}

export function buildQuickTake(post: PostRow): string {
  const paragraphs = splitPostParagraphs(post.inferred);
  const lead = firstSentence(paragraphs[0] ?? post.inferred);
  const forward = post.hypothesis.trim()
    ? firstSentence(post.hypothesis)
    : "";

  if (!forward) {
    return clampText(lead, 210);
  }

  if (forward === lead || lead.includes(forward) || forward.includes(lead)) {
    return clampText(lead, 210);
  }

  if (lead.length < 96) {
    return clampText(`${lead} ${forward}`, 210);
  }

  return clampText(lead, 210);
}

export function getPostOpinion(post: PostRow): string {
  const storedOpinion = normalizeWhitespace(post.opinion);
  if (storedOpinion) {
    return storedOpinion;
  }

  const crossSignal = normalizeWhitespace(post.cross_signal);
  if (crossSignal) {
    return crossSignal;
  }

  const hypothesis = normalizeWhitespace(post.hypothesis);
  if (hypothesis) {
    return hypothesis;
  }

  return clampText(firstSentence(post.inferred), 220);
}

export function buildOpinionPreview(post: PostRow): string {
  return clampText(getPostOpinion(post), 160);
}

export function buildSelectionReason(post: PostRow): string {
  const factCount = post.observed.filter((fact) => fact.trim().length > 0).length;
  const mode = getPostModeLabel(post);

  if (factCount <= 1) {
    if (post.category === "World") {
      return "Материал держится на одном проверяемом событии без лишней морали и искусственных связок.";
    }

    return "Одного факта достаточно для короткой записи, поэтому материал не раздувает его до подборки.";
  }

  if (mode === "Разбор") {
    return "Факт требует короткого разбора, потому что его значение не заканчивается первым абзацем.";
  }

  if (mode === "Контекст") {
    return "Здесь сошлись несколько деталей: важен не один заголовок, а рабочая связка между фактами.";
  }

  switch (post.category) {
    case "Markets":
      return "В данных есть конкретное движение, поэтому запись держится на цифрах, а не на общем настроении.";
    case "Sports":
      return "В спортивной ленте здесь был не только счет, но и следующий ход, который стоило проговорить отдельно.";
    case "Tech":
      return "В технологической новости есть проверяемая деталь, а не только очередной анонс.";
    case "World":
    default:
      return "Материал держится на нескольких деталях и не требует искусственной связки.";
  }
}
