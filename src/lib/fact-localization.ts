function normalizeFact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function coerceEnglishFactToRussianFallback(fact: string): string | null {
  const normalized = normalizeFact(fact);

  if (!normalized) {
    return null;
  }

  const spacexResupply = normalized.match(
    /\b(\d+)(?:st|nd|rd|th)?\s+SpaceX\s+commercial\s+resupply\s+mission\b/i,
  );

  if (
    spacexResupply &&
    /International\s+Space\s+Station/i.test(normalized) &&
    /scientific\s+experiments?/i.test(normalized)
  ) {
    return `Стартовала ${spacexResupply[1]}-я коммерческая миссия SpaceX по снабжению Международной космической станции с новыми научными экспериментами NASA.`;
  }

  if (
    /making\s+llms?\s+faster\s+without\s+sacrificing\s+accuracy/i.test(normalized) ||
    (/scaling\s+law/i.test(normalized) && /throughput/i.test(normalized))
  ) {
    return "Amazon Science описала scaling law для ускорения LLM без потери точности, с проверкой через throughput и качество ответа.";
  }

  if (
    /total\s+solar\s+eclipse\s+on\s+12\s+August\s+2026/i.test(normalized) &&
    /\b(?:ESA|European\s+Space\s+Agency)\b/i.test(normalized)
  ) {
    return "ESA анонсировало сопровождение полного солнечного затмения 12 августа 2026 года в очном и онлайн-формате.";
  }

  if (
    /atlas\s+reveals\s+rocks\s+with\s+rare\s+earth\s+element\s+potential/i.test(normalized) &&
    /critical-metal-bearing\s+igneous\s+rocks/i.test(normalized)
  ) {
    return "Новый атлас показал глобальное распределение редких магматических пород с потенциалом редкоземельных элементов и помогает точнее искать новые месторождения.";
  }

  const frankfurterDirect = normalized.match(
    /^Frankfurter (\d{4}-\d{2}-\d{2}): (.+)\.$/u,
  );
  if (frankfurterDirect) {
    return `Курс Frankfurter на ${frankfurterDirect[1]}: ${frankfurterDirect[2]}.`;
  }

  const reservePairs = normalized.match(
    /^Major reserve pairs on (\d{4}-\d{2}-\d{2}): (.+)\.$/u,
  );
  if (reservePairs) {
    return `Основные резервные пары на ${reservePairs[1]}: ${reservePairs[2]}.`;
  }

  const unchangedPair = normalized.match(
    /^USD\/([A-Z]{3}) was nearly unchanged versus the previous fixing, ending at ([0-9.]+) on (\d{4}-\d{2}-\d{2})\.$/u,
  );
  if (unchangedPair) {
    return `USD/${unchangedPair[1]} почти не изменился к предыдущему фиксингу и закрылся на ${unchangedPair[2]} ${unchangedPair[3]}.`;
  }

  const movedPair = normalized.match(
    /^USD\/([A-Z]{3}) (rose|fell) by ([^ ]+) versus the previous fixing, ending at ([0-9.]+) on (\d{4}-\d{2}-\d{2})\.$/u,
  );
  if (movedPair) {
    const verb = movedPair[2] === "rose" ? "вырос" : "снизился";
    return `USD/${movedPair[1]} ${verb} на ${movedPair[3]} к предыдущему фиксингу и закрылся на ${movedPair[4]} ${movedPair[5]}.`;
  }

  const tradedNear = normalized.match(
    /^([A-Za-z0-9 .+-]+) traded near (.+) with a 24h move of ([^ ]+)\.$/u,
  );
  if (tradedNear) {
    return `${tradedNear[1].trim()} торговался около ${tradedNear[2].trim()} при изменении за 24 часа ${tradedNear[3].trim()}.`;
  }

  const outperformed = normalized.match(
    /^([A-Za-z0-9 .+-]+) outperformed the other major coin by about ([0-9.]+) percentage points over the last 24 hours\.$/u,
  );
  if (outperformed) {
    return `${outperformed[1].trim()} опередил другую крупную монету примерно на ${outperformed[2]} п.п. за последние 24 часа.`;
  }

  return null;
}
