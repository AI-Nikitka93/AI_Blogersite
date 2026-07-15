import assert from "node:assert/strict";

import { focusPayloadForGeneration, validatePostQuality } from "./quality";

{
  const post = {
    title: "USD/RUB подрос, USD/BYN застыл",
    source: "Frankfurter",
    observed: [
      "USD/RUB вырос на +0.18 к предыдущему фиксингу и закрылся на 76.62 2026-07-13.",
      "USD/BYN почти не изменился к предыдущему фиксингу и закрылся на 2.86 2026-07-13.",
    ],
    inferred: [
      "USD/RUB вырос с 76.44 до 76.62, тогда как USD/BYN остался около 2.86. Два соседних ряда дали разный дневной результат, поэтому это не повод называть движение общим разворотом доллара.",
      "Сравнение двух фиксингов показывает только изменение внутри короткого отрезка. Оно полезно потому, что можно восстановить вчерашний уровень из сегодняшнего значения и дельты, но не объясняет, почему движение возникло. Причину источник не называет, и текст не должен ее придумывать.",
      "USD/BYN нужен здесь как соседняя контрольная линия. Его почти неподвижное значение не доказывает независимость рынков, зато не позволяет назвать один сдвиг общим движением доллара. Для такого наблюдения важнее различие в темпе, чем эффектная формулировка о развороте.",
      "Внешние пары EUR, GBP и JPY остаются справочными цифрами, а не объяснением для этого эпизода. Frankfurter фиксирует курсы, но не раскрывает мотивы участников или причину сдвига. Поэтому корректный язык этой заметки — сравнение рядов и проверка, а не рассказ о скрытой причине.",
      "Следующий фиксинг даст только один честный тест. Если USD/RUB снова изменится при спокойном USD/BYN, расхождение получит вторую точку. Если значение вернется ближе к 76.44, нынешняя запись останется дневным отклонением без самостоятельного тренда.",
    ].join("\n\n"),
    opinion:
      "Я вижу здесь не тренд доллара, а разрыв между двумя временными рядами: рублевая пара сдвинулась, белорусская — нет. Мой вывод пока узкий: следующий фиксинг либо повторит это расхождение, либо снимет его как дневной шум.",
    cross_signal:
      "Расхождение соседних пар важнее одной общей цифры курса.",
    hypothesis:
      "Повтор движения USD/RUB при спокойном USD/BYN усилит сигнал, возврат к вчерашнему уровню его снимет.",
    telegram_text:
      "Вчера USD/RUB был 76.44, сегодня 76.62 (+0.18). USD/BYN при этом остался около 2.86. Для алгоритма это не общий «рост доллара», а расхождение двух рядов: следующий фиксинг либо подтвердит сигнал, либо оставит его дневным шумом.",
    reasoning:
      "Frankfurter дает два соседних фиксинга, из которых можно честно собрать сравнение и следующий тест.",
    confidence: "medium" as const,
    category: "Markets" as const,
  };

  assert.equal(
    validatePostQuality(
      post,
      {
        category_hint: "Markets",
        source: "Frankfurter",
        facts: [
          "USD/RUB rose by +0.18 versus the previous fixing, ending at 76.62 on 2026-07-13.",
          "USD/BYN was nearly unchanged versus the previous fixing, ending at 2.86 on 2026-07-13.",
        ],
      },
      "markets_fx",
    ),
    null,
  );
}

{
  const post = {
    title: "Сдвиг масштаба: SkillOpt обучает навыки без изменения весов",
    source: "Microsoft Research",
    observed: [
      "Microsoft Research представила SkillOpt как способ обучать навыки агентов без изменения весов модели.",
    ],
    inferred:
      "SkillOpt превращает правку навыков в обучаемый процесс, но заголовок не должен начинаться с шаблонной приставки.",
    opinion: "Здесь важен сам метод, а не служебная метка в title.",
    cross_signal: "",
    hypothesis: "",
    telegram_text: "SkillOpt учит навыки агентов без переобучения всей модели.",
    reasoning: "Проверяется блокировка шаблонного заголовка.",
    confidence: "medium" as const,
    category: "Tech" as const,
  };

  assert.equal(
    validatePostQuality(
      post,
      {
        category_hint: "Tech",
        source: "Microsoft Research",
        facts: [
          "Microsoft Research представила SkillOpt как способ обучать навыки агентов без изменения весов модели.",
        ],
      },
      "tech_world",
    ),
    "quality gate blocked generic title",
  );
}

{
  const post = {
    title: "Turnstile сохраняет token ID для обучения агентов",
    source: "Amazon Science",
    observed: [
      "Amazon Science представила Rust-прокси Turnstile, который сохраняет token ID во взаимодействиях агента.",
    ],
    inferred:
      "Turnstile сохраняет token ID во взаимодействиях агента. Это делает исходный след работы модели точнее, но само по себе не доказывает скорость обучения или качество будущих результатов.",
    opinion: "Наконец-то инфраструктура получила точный журнал действий.",
    cross_signal: "",
    hypothesis: "",
    telegram_text: "Turnstile сохраняет token ID для более точного следа взаимодействий.",
    reasoning: "Один источник подтверждает только сохранение token ID.",
    confidence: "medium" as const,
    category: "Tech" as const,
  };

  assert.equal(
    validatePostQuality(
      post,
      {
        category_hint: "Tech",
        source: "Amazon Science",
        facts: [
          "Amazon Science представила Rust-прокси Turnstile, который сохраняет token ID во взаимодействиях агента.",
        ],
      },
      "tech_world",
    ),
    "quality gate blocked formulaic or performative opinion opener",
  );
}

{
  const post = {
    title: "Turnstile сохраняет token ID для обучения агентов",
    source: "Amazon Science",
    observed: [
      "Amazon Science представила Rust-прокси Turnstile, который сохраняет token ID во взаимодействиях агента.",
    ],
    inferred:
      "Turnstile сохраняет token ID во взаимодействиях агента. OpenAI Gym и DeepMind Lab могут показать, станет ли этот слой новым стандартом.",
    opinion: "Точный журнал полезнее красивой догадки о том, что было в запросе.",
    cross_signal: "",
    hypothesis: "",
    telegram_text: "Turnstile сохраняет token ID для более точного следа взаимодействий.",
    reasoning: "Один источник подтверждает только сохранение token ID.",
    confidence: "medium" as const,
    category: "Tech" as const,
  };

  assert.equal(
    validatePostQuality(
      post,
      {
        category_hint: "Tech",
        source: "Amazon Science",
        facts: [
          "Amazon Science представила Rust-прокси Turnstile, который сохраняет token ID во взаимодействиях агента.",
        ],
      },
      "tech_world",
    ),
    "quality gate blocked unsupported named entity in single-fact draft: OpenAI",
  );
}

{
  const focused = focusPayloadForGeneration(
    {
      category_hint: "Sports",
      source: "Sport-Express",
      facts: [
        "Сборная России по гандболу обыграла Гонконг в матче международного товарищеского турнира в Ганьчжоу — 44:11.",
        "Сидни Кросби вошел в состав сборной Канады на чемпионат мира по хоккею-2026.",
        "АПЛ опубликовала список номинантов на звание лучшего футболиста сезона-2025/26.",
      ],
    },
    "sports",
  );

  assert.deepEqual(focused.facts, [
    "Сборная России по гандболу обыграла Гонконг в матче международного товарищеского турнира в Ганьчжоу — 44:11.",
  ]);
}

{
  const focused = focusPayloadForGeneration(
    {
      category_hint: "Tech",
      source: "NASA Technology",
      facts: [
        "Анализ показал, где искусственное освещение ночью усилилось, а где оно уменьшилось.",
        "Технология NASA по 3D-печати помогает строить более прочные здания на Земле.",
      ],
    },
    "tech_world",
  );

  assert.deepEqual(focused.facts, [
    "Анализ показал, где искусственное освещение ночью усилилось, а где оно уменьшилось.",
  ]);
}

{
  const focused = focusPayloadForGeneration(
    {
      category_hint: "World",
      source: "Phys.org",
      facts: [
        "Новый атлас показал глобальное распределение редких магматических пород.",
        "Соседний RSS item про пожары не является подтверждением той же истории.",
      ],
      corroborating_sources: [
        {
          source: "Phys.org",
          url: "https://phys.org/news/2026-05-atlas-reveals-rare-earth-element.html",
          title: "Atlas reveals rocks with rare earth element potential",
        },
        {
          source: "Phys.org",
          url: "https://phys.org/news/2026-05-colorado-preps-wildfire-onslaught.html",
          title: "With record-low snow, Colorado preps for wildfire onslaught",
        },
      ],
    },
    "world",
    "retry",
  );

  assert.deepEqual(focused.facts, [
    "Новый атлас показал глобальное распределение редких магматических пород.",
  ]);
  assert.deepEqual(focused.corroborating_sources, [
    {
      source: "Phys.org",
      url: "https://phys.org/news/2026-05-atlas-reveals-rare-earth-element.html",
      title: "Atlas reveals rocks with rare earth element potential",
    },
  ]);
}

{
  const observedFact =
    "Пять питчеров «Торонто Блю Джейс» вместе оформили сухой матч против «Нью-Йорк Янкиз», позволив сопернику только три хита.";
  const post = {
    title: "Пять питчеров «Торонто Блю Джейс» вместе оформили сухой",
    source: "MLB News",
    source_url: "https://www.mlb.com/news/example",
    source_published_at: "2026-05-22T10:00:00.000Z",
    event_date: "2026-05-22",
    observed: [observedFact],
    inferred: [
      "Пять питчеров «Торонто Блю Джейс» вместе оформили сухой матч против «Нью-Йорк Янкиз», позволив сопернику только три хита. Для спортивной записи это не календарная мелочь, а редкий коллективный результат, где нагрузка распределилась по нескольким рукам и все равно не распалась к финалу игры.",
      "Главная деталь здесь не в самом счете, а в том, что «Торонто» удержал матч без провала после смены питчеров. В бейсболе такая линия быстро ломается одним слабым иннингом, поэтому коллективный shutout обычно говорит не только о форме стартера, но и о глубине bullpen.",
      "Для «Нью-Йорка» этот эпизод выглядит как проверка атаки под давлением: три хита за весь матч оставляют мало пространства для случайного объяснения. Если серия продолжится такими сухими отрезками, разговор уйдет от отдельной игры к вопросу, где именно застревает контакт и выход на базы.",
      "Для «Торонто» следующий сигнал будет простым: повторится ли контроль после другой ротации и против другого набора бьющих. Один сухой матч сам по себе еще не делает устойчивую форму, но он дает конкретный ориентир, который можно сверить уже в ближайшем игровом цикле.",
      "Поэтому материал держится на проверяемой спортивной точке: коллективный pitching staff не просто выиграл, а закрыл соперника почти без шансов. Такая запись должна выходить только с полноценным заголовком, потому что обрезанный финальный эпитет ломает смысл еще до первого абзаца.",
    ].join("\n\n"),
    opinion:
      "Коллективный сухой матч здесь важен как проверка глубины питчерской ротации, а не как обычная строка результата.",
    cross_signal:
      "В бейсболе серия смен питчеров становится сильным сигналом только тогда, когда контроль не теряется после первой замены.",
    hypothesis:
      "Если «Торонто» повторит контроль при другой ротации, разговор сместится от одного результата к устойчивости всей питчерской группы.",
    telegram_text:
      "Пять питчеров «Торонто» вместе закрыли «Янкиз» почти без хитов. Здесь важен не счет, а то, что контроль не развалился после смен.",
    reasoning:
      "Проверяется защита от заголовка, который обрезал исходный факт без многоточия.",
    confidence: "medium" as const,
    category: "Sports" as const,
  };

  assert.equal(
    validatePostQuality(
      post,
      {
        category_hint: "Sports",
        source: "MLB News",
        source_url: "https://www.mlb.com/news/example",
        source_published_at: "2026-05-22T10:00:00.000Z",
        event_date: "2026-05-22",
        facts: [observedFact],
      },
      "sports",
    ),
    "quality gate blocked truncated title",
  );
}

{
  const leakedObserved =
    "Источник фиксирует: Making LLMs faster without sacrificing accuracy, Amazon Science described a scaling law for model throughput.";
  const post = {
    title: "Amazon Science ускорила проверку LLM",
    source: "Amazon Science",
    observed: [leakedObserved],
    inferred: [
      "Amazon Science описала LLM-механизм, но observed-строка осталась на английском после русского префикса. Такая строка выглядит как готовый факт, хотя читатель получает сырой англоязычный фрагмент вместо нормальной русской формулировки.",
      "Для технологической записи это критично: сайт заявлен как русская лента, и фактический слой должен быть читаемым без мысленного перевода. Если английский текст спрятан за русским вводным словом, quality gate обязан остановить публикацию раньше остальных проверок.",
      "Проверка не должна мешать нормальным техническим терминам вроде LLM, throughput или accuracy, когда сама фраза написана по-русски. Здесь проблема другая: грамматика и основной смысл строки остались английскими.",
      "Следующий шаг для такого черновика простой: либо переписать observed по-русски с сохранением чисел и названий, либо не публиковать материал. Иначе Telegram и RSS получают строку, которую система ошибочно выдает за локализованный факт.",
      "Такая защита особенно нужна после неудачной локализации источника. Внешний RSS часто приходит на английском, и аварийная ветка должна либо получить нормальную русскую строку, либо честно остановить выпуск. Русское вводное слово не является переводом факта и не делает запись пригодной для публикации.",
      "В тесте важно именно поведение фильтра, а не качество статьи. Текст специально держит один и тот же внешний факт, чтобы остальные проверки не спорили о связанности темы. Если фильтр пропустит такую строку, следующий слой уже не отличит локализованный observed от сырого заголовка источника.",
    ].join("\n\n"),
    opinion:
      "Amazon Science и LLM здесь важны именно потому, что русский префикс не должен маскировать английскую фактическую строку.",
    cross_signal:
      "Фактический слой важнее оформления: если observed остался английским, выпуск надо остановить.",
    hypothesis:
      "Если проверка увидит латинскую грамматику под русским префиксом, следующие world и tech слоты не будут выпускать сырой RSS-текст.",
    telegram_text:
      "Amazon Science дала факт про LLM-ускорение, но сырой английский observed нельзя выпускать в русскую ленту.",
    reasoning:
      "Проверяется защита от английского текста, спрятанного под русским служебным префиксом.",
    confidence: "medium" as const,
    category: "Tech" as const,
  };

  assert.equal(
    validatePostQuality(
      post,
      {
        category_hint: "Tech",
        source: "Amazon Science",
        facts: [
          "Making LLMs faster without sacrificing accuracy, Amazon Science described a scaling law for model throughput.",
        ],
      },
      "tech_world",
    ),
    "quality gate blocked English observed fact in Russian mode",
  );
}

{
  const post = {
    title: "USD/RUB сдал, USD/BYN застыл",
    source: "Frankfurter",
    observed: [
      "USD/RUB снизился на -0.14 к предыдущему фиксингу и закрылся на 72.98 2026-05-16.",
      "USD/BYN почти не изменился к предыдущему фиксингу и закрылся на 3.0 2026-05-16.",
    ],
    inferred: [
      "USD/RUB снизился на -0.14 к предыдущему фиксингу и закрылся на 72.98 2026-05-16. USD/BYN почти не изменился к предыдущему фиксингу и закрылся на 3.0 2026-05-16. Валютная таблица поэтому показывает не общий долларовый шум, а разную скорость соседних пар.",
      "Проблема не в самом уровне курса, а в моменте расхождения. Одна пара уже двинулась, другая почти стоит на месте, и именно эта асимметрия делает факт пригодным для короткой рыночной записи. Источник дает дату, направление и соседнюю пару для сравнения.",
      "Такой замер не превращается в торговый вывод и не обещает продолжения. Он просто показывает, где рынок перестал быть ровной строкой. Если следующий фиксинг сохранит разрыв, это станет второй точкой линии; если нет, останется дневным перекосом.",
      "Важно, что латинские тикеры здесь работают как имена инструментов, а не как английская грамматика. Вокруг них стоит русское объяснение, русские глаголы и русская логика вывода, поэтому language gate должен отличать коды рынка от сырого английского предложения.",
      "Следующая проверка остается простой: посмотреть новый фиксинг и сравнить темп тех же пар. В такой записи важна не латинская форма тикеров, а русская рамка вокруг факта, которая не выдает тикерные коды за английское предложение. Поэтому статья сохраняет узкий вывод: факт отдельно, возможное продолжение отдельно.",
    ].join("\n\n"),
    opinion:
      "USD/RUB и USD/BYN здесь важны как проверка разной скорости соседних пар, а не как общий рассказ про доллар.",
    cross_signal:
      "Валютная запись держится на различии между парами, а не на одном общем слове про рынок.",
    hypothesis:
      "Если следующий фиксинг сохранит разный темп, линия получит продолжение без торгового вывода.",
    telegram_text:
      "USD/RUB снизился, а USD/BYN почти не сдвинулся. Здесь важна разная скорость соседних пар.",
    reasoning:
      "Проверяется, что латинские тикеры рядом с русским текстом не считаются английским заголовком.",
    confidence: "medium" as const,
    category: "Markets" as const,
  };

  assert.equal(
    validatePostQuality(
      post,
      {
        category_hint: "Markets",
        source: "Frankfurter",
        facts: [
          "USD/RUB fell by -0.14 versus the previous fixing, ending at 72.98 on 2026-05-16.",
          "USD/BYN was nearly unchanged versus the previous fixing, ending at 3.0 on 2026-05-16.",
        ],
      },
      "markets_fx",
    ),
    null,
  );
}

{
  const post = {
    title: "Рублевая пара снизилась после фиксинга",
    source: "Frankfurter",
    observed: [
      "Доллар к рублю снизился на -0.14 к предыдущему фиксингу и закрылся на 72.98 2026-05-16.",
      "Доллар к белорусскому рублю почти не изменился к предыдущему фиксингу и закрылся на 3.0 2026-05-16.",
    ],
    inferred: [
      "Доллар к рублю снизился на -0.14 к предыдущему фиксингу и закрылся на 72.98 2026-05-16. Рядом доллар к белорусскому рублю почти не изменился, поэтому валютная таблица показывает разную скорость соседних пар. Это достаточно конкретный факт для короткой рыночной записи, потому что в нем есть дата, направление и соседняя пара для сравнения.",
      "Проблема не в самом уровне курса, а в том, что рублевая пара уже двинулась, пока белорусская осталась почти на месте. Такой разрыв помогает отделить дневной перекос от общего валютного шума. Но текст не должен превращать это в совет или торговый сценарий, потому что источник показывает только фиксинг, а не намерение участников рынка.",
      "Если внутри статьи появляется слово ставка как поведенческий призыв, публичный фильтр все равно заблокирует запись перед вставкой. Agent quality должен поймать такой риск раньше, чтобы маршрут мог уйти в детерминированную рыночную заметку, а не терять слот после генерации. Это важно именно для автоматической публикации: поздний отказ уже выглядит как сломанный cron, хотя источник был рабочим.",
      "Следующая проверка остается простой: сохранится ли разная скорость на новом фиксинге. Если рублевая и белорусская пары снова пойдут разными темпами, это будет продолжение линии. Если разрыв исчезнет, запись останется коротким дневным замером, без торгового вывода и без попытки сделать из одной таблицы большой прогноз.",
    ].join("\n\n"),
    opinion:
      "Рублевая и белорусская пары здесь важны только как проверка разной скорости, а не как повод для ставки.",
    cross_signal:
      "Валютная запись держится на различии между парами, а не на общем слове про рынок.",
    hypothesis:
      "Если следующий фиксинг сохранит разный темп, линия получит продолжение без торгового вывода.",
    telegram_text:
      "Рублевая пара снизилась, а белорусская почти не сдвинулась. Здесь важна разная скорость соседних пар, а не ставка на движение.",
    reasoning:
      "Факт публикуем только если рискованная копия блокируется до финальной вставки.",
    confidence: "medium" as const,
    category: "Markets" as const,
  };

  assert.equal(
    validatePostQuality(
      post,
      {
        category_hint: "Markets",
        source: "Frankfurter",
        facts: [
          "USD/RUB fell by -0.14 versus the previous fixing, ending at 72.98 on 2026-05-16.",
          "USD/BYN was nearly unchanged versus the previous fixing, ending at 3.0 on 2026-05-16.",
        ],
      },
      "markets_fx",
    ),
    "public post contains blocked quality-risk phrasing",
  );
}

{
  const focused = focusPayloadForGeneration(
    {
      category_hint: "World",
      source: "TechNews",
      source_url: "https://technews.example.com",
      source_published_at: "2026-06-25T10:00:00.000Z",
      event_date: "2026-06-25",
      facts: [
        "Physicists discover new particle in laboratory.",
        "SpaceX rocket launch was successful on Tuesday.",
        "SpaceX rocket test scheduled for next month.",
      ],
      corroborating_sources: [
        {
          source: "TechNews",
          url: "https://technews.example.com/physics-particle",
          title: "Physicists discover new particle",
          published_at: "2026-06-25T09:00:00.000Z",
        },
        {
          source: "TechNews",
          url: "https://technews.example.com/spacex-launch-success",
          title: "SpaceX rocket launch success",
          published_at: "2026-06-25T10:00:00.000Z",
        },
        {
          source: "TechNews",
          url: "https://technews.example.com/spacex-test-scheduled",
          title: "SpaceX rocket test scheduled",
          published_at: "2026-06-25T11:00:00.000Z",
        },
      ],
    },
    "world",
    "default",
  );

  assert.deepEqual(focused.facts, [
    "SpaceX rocket launch was successful on Tuesday.",
  ]);
  assert.deepEqual(focused.corroborating_sources, [
    {
      source: "TechNews",
      url: "https://technews.example.com/spacex-launch-success",
      title: "SpaceX rocket launch success",
      published_at: "2026-06-25T10:00:00.000Z",
    },
  ]);
  assert.equal(focused.source_url, "https://technews.example.com/spacex-launch-success");
  assert.equal(focused.source_published_at, "2026-06-25T10:00:00.000Z");
  assert.equal(focused.event_date, "2026-06-25");
}
