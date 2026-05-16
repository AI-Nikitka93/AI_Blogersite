import { readFileSync } from "node:fs";

const fixturePath = "eval/quality-fixtures.jsonl";

const rules = [
  {
    id: "financial_advice",
    patterns: [
      /купить|покупать|покупку|продать|шортить|лонговать|усредняться|фиксировать\s+прибыль|стоп-лосс|тейк-профит|точк[аи]\s+входа/iu,
      /возможност[ьи]\s+для\s+вход/iu,
      /переоценк\w*\s+(?:портфел|позиц|капитал)/iu,
      /переориентировк\w*\s+(?:портфел|позиц|капитал)/iu,
      /сигнал\s+к\s+(?:переоценк|переориентировк)/iu,
      /(?:инвестиц|инвестор|инвестир\w*|трейдер)/iu,
      /стоит\s+обратить\s+внимани/iu,
      /наблюдайте\s+за/iu,
    ],
  },
  {
    id: "sports_betting_or_coachy",
    patterns: [
      /я\s+ставлю|ставк[аиуы]|коэффициент[а-я]*|букмекер[а-я]*/iu,
      /потерпел[аи]?\s+[^.!?]{0,80}\s+побед/iu,
      /требует\s+немедленн\w*\s+вмешательств/iu,
      /необходимо\s+изменить\s+тактик/iu,
    ],
  },
  {
    id: "template_or_repetitive_voice",
    patterns: [
      /\bfallback\b|PR-шум|Техдень\s+сдвинулся/iu,
      /главн\w*\s+фильтр\w*\s+Миро/iu,
      /в\s+рынках\s+мне\s+мало\s+самой\s+цены/iu,
      /источник\s+здесь\s+важен\s+не\s+как\s+вывеска/iu,
      /если\s+эта\s+проверка\s+не\s+сработает/iu,
      /смысл\s+такой\s+статьи/iu,
      /материал\s+не\s+делает\s+прогноз\s+сильнее\s+исходных\s+данных/iu,
      /поэтому\s+текст\s+держится\s+на\s+двух\s+вещах/iu,
      /источник\s+материала\s+—/iu,
      /следующая\s+проверка\s+находится\s+в\s+повторяемости/iu,
    ],
  },
  {
    id: "truncated_title",
    patterns: [/(?:…|\.{3})\s*$/iu],
  },
  {
    id: "mixed_sports_story",
    patterns: [
      /гандбол[\s\S]{0,220}(?:кросби|хокке|апл)/iu,
      /(?:кросби|хокке|апл)[\s\S]{0,220}гандбол/iu,
    ],
  },
  {
    id: "site_self_report_voice",
    patterns: [
      /\bменя\s+здесь\b/iu,
      /\bмне\s+здесь\b/iu,
      /\bдля\s+меня\b/iu,
      /\bя\s+(?:оставляю|не\s+достраиваю|смотрю|не\s+верю|не\s+покупаю|не\s+считаю|считаю|вижу|слышу|проверяю|бы)\b/iu,
      /опора\s+здесь\s+простая/iu,
      /ограничение\s+остается\s+жестким/iu,
      /в\s+технологической\s+ленте\s+такие\s+новости/iu,
      /не\s+достраиваю\s+вокруг\s+факта/iu,
    ],
  },
  {
    id: "telegram_admin_boilerplate",
    patterns: [
      /полная\s+(?:мысль|запись|версия|статья)/iu,
      /(?:читайте?|подробности)\s+на\s+сайте/iu,
      /на\s+сайте\s*[—-]\s*почему/iu,
      /вышла\s+новая\s+(?:заметка|статья)/iu,
      /сегодня\s+в\s+канале/iu,
      /мы\s+опубликовали/iu,
    ],
  },
];

const fixtures = readFileSync(fixturePath, "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const results = fixtures.map((fixture) => {
  const hits = rules
    .map((rule) => ({
      rule: rule.id,
      matched: rule.patterns.some((pattern) => pattern.test(fixture.output)),
    }))
    .filter((result) => result.matched)
    .map((result) => result.rule);

  return {
    id: fixture.id,
    topic: fixture.topic,
    expected_rejection_terms: fixture.must_reject_phrases.length,
    matched_rules: hits,
    passed: hits.length > 0,
  };
});

const failed = results.filter((result) => !result.passed);
const report = {
  fixture_count: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  results,
};

console.log(JSON.stringify(report, null, 2));

if (failed.length > 0) {
  console.error(
    `Content quality eval failed for fixtures: ${failed
      .map((result) => result.id)
      .join(", ")}`,
  );
  process.exit(1);
}
