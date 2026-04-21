export type ScheduledMiroTopic =
  | "sports"
  | "markets_fx"
  | "markets_crypto"
  | "tech_world"
  | "world";

export type MiroScheduleWindow =
  | "morning"
  | "late_morning"
  | "day"
  | "late_day"
  | "evening";

export interface MiroScheduleSlot {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  weekday_label: string;
  window: MiroScheduleWindow;
  window_label: string;
  local_time: string;
  topic: ScheduledMiroTopic;
  track_label: string;
  description: string;
}

export interface MiroScheduleDay {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  weekday_label: string;
  slots: readonly MiroScheduleSlot[];
}

export interface MiroPublishDecision {
  kind: "publish";
  slot: MiroScheduleSlot;
}

export interface MiroQuietDecision {
  kind: "quiet";
  reason: string;
  next_slot: MiroScheduleSlot;
}

export interface MiroUrgentWindowStatus {
  is_open: boolean;
  reason: string;
  suggested_topic: ScheduledMiroTopic;
  next_slot: MiroScheduleSlot;
}

export type MiroScheduleDecision = MiroPublishDecision | MiroQuietDecision;

export const MIRO_SCHEDULE_TIMEZONE = "Europe/Minsk";
export const MIRO_MORNING_SLOT_TIME = "08:00";
export const MIRO_LATE_MORNING_SLOT_TIME = "11:00";
export const MIRO_DAY_SLOT_TIME = "14:00";
export const MIRO_LATE_DAY_SLOT_TIME = "17:00";
export const MIRO_EVENING_SLOT_TIME = "20:00";
export const MIRO_DAILY_SLOT_TIMES = [
  MIRO_MORNING_SLOT_TIME,
  MIRO_LATE_MORNING_SLOT_TIME,
  MIRO_DAY_SLOT_TIME,
  MIRO_LATE_DAY_SLOT_TIME,
  MIRO_EVENING_SLOT_TIME,
] as const;
export const MIRO_URGENT_WINDOW_LABEL = "07:00–22:30";
export const MIRO_SCHEDULE_LOWER_BOUND = "не меньше 28 публикаций в неделю";
export const MIRO_SCHEDULE_UPPER_BOUND = "до 35 плановых публикаций в неделю";
const SLOT_TOLERANCE_MINUTES = 60;

const WEEKDAY_LABELS: Record<0 | 1 | 2 | 3 | 4 | 5 | 6, string> = {
  0: "Воскресенье",
  1: "Понедельник",
  2: "Вторник",
  3: "Среда",
  4: "Четверг",
  5: "Пятница",
  6: "Суббота",
};

function parseClockToMinutes(clock: string): number {
  const [hours, minutes] = clock.split(":").map((part) => Number(part));
  return hours * 60 + minutes;
}

const WINDOW_BOUNDS: Record<MiroScheduleWindow, { start: number; end: number }> = {
  morning: {
    start: parseClockToMinutes(MIRO_MORNING_SLOT_TIME) - SLOT_TOLERANCE_MINUTES,
    end: parseClockToMinutes(MIRO_MORNING_SLOT_TIME) + SLOT_TOLERANCE_MINUTES,
  },
  late_morning: {
    start: parseClockToMinutes(MIRO_LATE_MORNING_SLOT_TIME) - SLOT_TOLERANCE_MINUTES,
    end: parseClockToMinutes(MIRO_LATE_MORNING_SLOT_TIME) + SLOT_TOLERANCE_MINUTES,
  },
  day: {
    start: parseClockToMinutes(MIRO_DAY_SLOT_TIME) - SLOT_TOLERANCE_MINUTES,
    end: parseClockToMinutes(MIRO_DAY_SLOT_TIME) + SLOT_TOLERANCE_MINUTES,
  },
  late_day: {
    start: parseClockToMinutes(MIRO_LATE_DAY_SLOT_TIME) - SLOT_TOLERANCE_MINUTES,
    end: parseClockToMinutes(MIRO_LATE_DAY_SLOT_TIME) + SLOT_TOLERANCE_MINUTES,
  },
  evening: {
    start: parseClockToMinutes(MIRO_EVENING_SLOT_TIME) - SLOT_TOLERANCE_MINUTES,
    end: parseClockToMinutes(MIRO_EVENING_SLOT_TIME) + SLOT_TOLERANCE_MINUTES,
  },
};

const WINDOW_ORDER: readonly MiroScheduleWindow[] = [
  "morning",
  "late_morning",
  "day",
  "late_day",
  "evening",
];
const WEEKDAY_ORDER = [0, 1, 2, 3, 4, 5, 6] as const;
const URGENT_START_MINUTES = 7 * 60;
const URGENT_END_MINUTES = 22 * 60 + 30;

function createSlot(
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  window: MiroScheduleWindow,
  topic: ScheduledMiroTopic,
  trackLabel: string,
  description: string,
): MiroScheduleSlot {
  const localTime =
    window === "morning"
      ? MIRO_MORNING_SLOT_TIME
      : window === "late_morning"
        ? MIRO_LATE_MORNING_SLOT_TIME
        : window === "day"
        ? MIRO_DAY_SLOT_TIME
        : window === "late_day"
          ? MIRO_LATE_DAY_SLOT_TIME
        : MIRO_EVENING_SLOT_TIME;

  const windowLabel =
    window === "morning"
      ? "Утро"
      : window === "late_morning"
        ? "Позднее утро"
      : window === "day"
        ? "День"
        : window === "late_day"
          ? "Поздний день"
        : "Вечер";

  return {
    weekday,
    weekday_label: WEEKDAY_LABELS[weekday],
    window,
    window_label: windowLabel,
    local_time: localTime,
    topic,
    track_label: trackLabel,
    description,
  };
}

export const MIRO_WEEKLY_SCHEDULE: readonly MiroScheduleSlot[] = [
  createSlot(
    1,
    "morning",
    "markets_fx",
    "Валютный старт недели",
    "Утром понедельника Миро ловит валютный и деловой ритм, чтобы задать тон всей неделе.",
  ),
  createSlot(
    1,
    "late_morning",
    "tech_world",
    "Позднее техно-утро",
    "Ближе к полудню понедельника технологии лучше отделяются от утреннего шума и звучат чище.",
  ),
  createSlot(
    1,
    "day",
    "world",
    "Дневной мировой сигнал",
    "Дневное окно понедельника отдано нейтральным мировым историям, когда утренний шум уже осел и лучше слышны спокойные сдвиги.",
  ),
  createSlot(
    1,
    "late_day",
    "sports",
    "Поздний импульс формы",
    "Под конец рабочего дня спорт лучше собирает темп, форму и упрямство без лишних пояснений.",
  ),
  createSlot(
    1,
    "evening",
    "world",
    "Вечерний спокойный мир",
    "Вечер понедельника завершает день тихим мировым наблюдением, а не еще одной сводкой.",
  ),
  createSlot(
    2,
    "morning",
    "tech_world",
    "Технологии до обеда",
      "Во вторник утро начинается с технологий: у ленты уже есть инерция, но еще хватает свежести для новых сигналов.",
  ),
  createSlot(
    2,
    "late_morning",
    "world",
    "Позднее мировое окно",
    "Во вторник к позднему утру мировые сигналы уже отделяются от первой утренней суеты.",
  ),
  createSlot(
    2,
    "day",
    "markets_crypto",
    "Крипто-пульс дня",
    "Дневной вторник отдан крипторынку: к этому часу быстрее проступают ускорения и тревожность.",
  ),
  createSlot(
    2,
    "late_day",
    "sports",
    "Поздний дневной темп",
    "Во вторник ближе к вечеру спорт дает хороший материал для ритма и давления.",
  ),
  createSlot(
    2,
    "evening",
    "world",
    "Тихий вечерний мир",
    "Вечером вторника Миро возвращается к спокойным world-сигналам, чтобы закончить день не шумом, а ощущением общего движения.",
  ),
  createSlot(
    3,
    "morning",
    "sports",
    "Утро спортивной формы",
    "Среда утром хорошо подходит для спорта: к середине недели уже заметны форма, терпение и просадка.",
  ),
  createSlot(
    3,
    "late_morning",
    "tech_world",
    "Позднее техно-наблюдение",
    "Среда ближе к полудню подходит для технологических сигналов без рекламного шума раннего утра.",
  ),
  createSlot(
    3,
    "day",
    "world",
    "Дневник внешнего мира",
    "Дневная среда держит нейтральные world-сигналы, чтобы лента не скатывалась только в счет и график.",
  ),
  createSlot(
    3,
    "late_day",
    "markets_fx",
    "Поздняя валюта недели",
    "Под вечер среды валютный слой лучше показывает, где неделя уже затянулась и где только собирается.",
  ),
  createSlot(
    3,
    "evening",
    "tech_world",
    "Вечерняя техно-пересборка",
    "Вечер среды оставлен под технологии, когда у дня уже накопился контекст и легче увидеть сдвиг привычек.",
  ),
  createSlot(
    4,
    "morning",
    "markets_crypto",
    "Крипто-утро поздней недели",
    "Четверг утром оставлен под крипту, когда у рынка уже видна усталость или внезапное ускорение.",
  ),
  createSlot(
    4,
    "late_morning",
    "world",
    "Позднее world-окно",
    "В четверг к позднему утру спокойные мировые истории звучат отчетливее и без утренней паники.",
  ),
  createSlot(
    4,
    "day",
    "sports",
    "Дневная проверка темпа",
    "Дневной четверг снова слушает спорт: там легче всего заметить импульс и дисциплину без лишних слов.",
  ),
  createSlot(
    4,
    "late_day",
    "tech_world",
    "Поздний технологический сдвиг",
    "Четверг ближе к вечеру подходит для техно-сигналов, где уже виден не анонс, а изменение привычки.",
  ),
  createSlot(
    4,
    "evening",
    "world",
    "Вечерний нейтральный сигнал",
    "Вечером четверга спокойные мировые истории проще звучат как наблюдение, а не как тревожная сирена.",
  ),
  createSlot(
    5,
    "morning",
    "tech_world",
    "Пятничный техно-старт",
    "Пятница утром начинается с технологий, чтобы неделя не заканчивалась только рынком и счетом.",
  ),
  createSlot(
    5,
    "late_morning",
    "world",
    "Позднее пятничное наблюдение",
    "Ближе к полудню пятницы Миро слушает внешний мир без спешки и без ощущения дедлайна.",
  ),
  createSlot(
    5,
    "day",
    "markets_fx",
    "Дневная валюта недели",
    "Днем пятницы валютный рынок хорошо показывает, как неделя собиралась в более спокойный или нервный рисунок.",
  ),
  createSlot(
    5,
    "late_day",
    "sports",
    "Пятничный предвечерний темп",
    "Перед вечером пятницы спорт хорошо держит ощущение формы и конца длинной недели.",
  ),
  createSlot(
    5,
    "evening",
    "markets_crypto",
    "Вечерний крипто-аккорд",
    "Пятничный вечер уходит в крипту, где конец недели часто чувствуется быстрее всего.",
  ),
  createSlot(
    6,
    "morning",
    "sports",
    "Субботний спортивный импульс",
    "Субботнее утро держится на спорте: это самый естественный дневниковый сигнал для начала выходных.",
  ),
  createSlot(
    6,
    "late_morning",
    "world",
    "Позднее выходное наблюдение",
    "К позднему утру субботы мир звучит тише и лучше подходит для спокойной фиксации.",
  ),
  createSlot(
    6,
    "day",
    "tech_world",
    "Выходной техно-сдвиг",
    "Днем субботы технологии лучше читаются как изменение привычек, а не как офисный шум.",
  ),
  createSlot(
    6,
    "late_day",
    "markets_crypto",
    "Поздний крипто-ритм выходного",
    "Под вечер субботы крипта остается одним из немногих рынков, где ритм не выключается вместе с неделей.",
  ),
  createSlot(
    6,
    "evening",
    "world",
    "Выходной вечер мира",
    "Вечер субботы лучше заканчивать нейтральным world-сигналом, а не еще одним резким экраном.",
  ),
  createSlot(
    0,
    "morning",
    "world",
    "Воскресное медленное утро",
    "Воскресенье утром мир звучит спокойнее всего, и это хорошее окно для тихого наблюдения.",
  ),
  createSlot(
    0,
    "late_morning",
    "sports",
    "Поздний спортивный выходной",
    "К позднему утру воскресенья спорт дает чистый импульс формы и выносливости без офисной суеты.",
  ),
  createSlot(
    0,
    "day",
    "world",
    "Спокойный воскресный обзор",
    "Днем воскресенья лучше работают тихие мировые сигналы без ощущения паники и гонки.",
  ),
  createSlot(
    0,
    "late_day",
    "tech_world",
    "Поздний техно-горизонт",
    "Под конец воскресного дня технологии помогают увидеть, куда неделя собирается дальше.",
  ),
  createSlot(
    0,
    "evening",
    "markets_fx",
    "Вечерняя настройка недели",
    "Воскресный вечер мягко возвращает валютный слой и настраивает внимание на будущую деловую неделю.",
  ),
] as const;

const WEEKDAY_TO_INDEX: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getMinskParts(date: Date): {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  totalMinutes: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: MIRO_SCHEDULE_TIMEZONE,
  }).formatToParts(date);

  const weekdayPart = parts.find((part) => part.type === "weekday")?.value ?? "Sun";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return {
    weekday: WEEKDAY_TO_INDEX[weekdayPart] ?? 0,
    totalMinutes: hour * 60 + minute,
  };
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function sortSlots(slots: readonly MiroScheduleSlot[]): readonly MiroScheduleSlot[] {
  return [...slots].sort(
    (left, right) =>
      WINDOW_BOUNDS[left.window].start - WINDOW_BOUNDS[right.window].start,
  );
}

function isInsideWindow(totalMinutes: number, window: MiroScheduleWindow): boolean {
  const bounds = WINDOW_BOUNDS[window];
  return totalMinutes >= bounds.start && totalMinutes < bounds.end;
}

function getSlotsForWeekday(
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6,
): readonly MiroScheduleSlot[] {
  return sortSlots(MIRO_WEEKLY_SCHEDULE.filter((slot) => slot.weekday === weekday));
}

function findTopicDefinitionSlot(topic: ScheduledMiroTopic): MiroScheduleSlot {
  return MIRO_WEEKLY_SCHEDULE.find((slot) => slot.topic === topic) ?? MIRO_WEEKLY_SCHEDULE[0];
}

function getActiveSlot(date: Date): MiroScheduleSlot | undefined {
  const { weekday, totalMinutes } = getMinskParts(date);
  return getSlotsForWeekday(weekday).find((slot) =>
    isInsideWindow(totalMinutes, slot.window),
  );
}

export function getNextMiroScheduleSlot(date: Date = new Date()): MiroScheduleSlot {
  const { weekday, totalMinutes } = getMinskParts(date);

  for (let offset = 0; offset <= 7; offset += 1) {
    const candidateDate = addDays(date, offset);
    const candidateWeekday =
      offset === 0 ? weekday : getMinskParts(candidateDate).weekday;
    const slots = getSlotsForWeekday(candidateWeekday);

    for (const slot of slots) {
      const slotStartsLaterToday =
        offset > 0 || WINDOW_BOUNDS[slot.window].start > totalMinutes;

      if (slotStartsLaterToday) {
        return slot;
      }
    }
  }

  return MIRO_WEEKLY_SCHEDULE[0];
}

export function getMiroScheduleDecision(date: Date = new Date()): MiroScheduleDecision {
  const activeSlot = getActiveSlot(date);

  if (activeSlot) {
    return {
      kind: "publish",
      slot: activeSlot,
    };
  }

    return {
      kind: "quiet",
      reason:
        "Сейчас у Миро пауза между слотами. Он держит пять плановых окон в день, а ночью намеренно не публикует, чтобы не превращаться в шум.",
      next_slot: getNextMiroScheduleSlot(date),
    };
  }

export function getMiroWeeklyScheduleByDay(): readonly MiroScheduleDay[] {
  return WEEKDAY_ORDER.map((weekday) => ({
    weekday,
    weekday_label: WEEKDAY_LABELS[weekday],
    slots: getSlotsForWeekday(weekday),
  }));
}

export function getMiroUrgentWindowStatus(
  date: Date = new Date(),
): MiroUrgentWindowStatus {
  const scheduleDecision = getMiroScheduleDecision(date);
  const { totalMinutes } = getMinskParts(date);
  const isOpen =
    totalMinutes >= URGENT_START_MINUTES && totalMinutes < URGENT_END_MINUTES;
  const suggestedTopic =
    scheduleDecision.kind === "publish"
      ? scheduleDecision.slot.topic
      : scheduleDecision.next_slot.topic;

  return {
    is_open: isOpen,
    reason: isOpen
      ? "Urgent-окно открыто: внеплановую заметку можно публиковать до позднего вечера."
      : "Сейчас ночное quiet-окно. Срочные сигналы откладываются до утра, если только человек не принимает отдельное ручное решение.",
    suggested_topic: suggestedTopic,
    next_slot:
      scheduleDecision.kind === "publish"
        ? getNextMiroScheduleSlot(date)
        : scheduleDecision.next_slot,
  };
}

export function canPublishUrgentSignal(date: Date = new Date()): boolean {
  return getMiroUrgentWindowStatus(date).is_open;
}

export function getSuggestedUrgentTopic(
  date: Date = new Date(),
): ScheduledMiroTopic {
  return getMiroUrgentWindowStatus(date).suggested_topic;
}

export function getMiroScheduleOverview(date: Date = new Date()): {
  decision: MiroScheduleDecision;
  weekly_schedule: readonly MiroScheduleSlot[];
  weekly_schedule_by_day: readonly MiroScheduleDay[];
  lower_bound: string;
  upper_bound: string;
  urgent_window_label: string;
  urgent_status: MiroUrgentWindowStatus;
} {
  return {
    decision: getMiroScheduleDecision(date),
    weekly_schedule: MIRO_WEEKLY_SCHEDULE,
    weekly_schedule_by_day: getMiroWeeklyScheduleByDay(),
    lower_bound: MIRO_SCHEDULE_LOWER_BOUND,
    upper_bound: MIRO_SCHEDULE_UPPER_BOUND,
    urgent_window_label: MIRO_URGENT_WINDOW_LABEL,
    urgent_status: getMiroUrgentWindowStatus(date),
  };
}

export function getDefaultTopicForSchedule(
  date: Date = new Date(),
): ScheduledMiroTopic {
  const decision = getMiroScheduleDecision(date);
  if (decision.kind === "publish") {
    return decision.slot.topic;
  }

  return decision.next_slot.topic;
}

export function getSlotTemplateForTopic(
  topic: ScheduledMiroTopic,
): MiroScheduleSlot {
  return findTopicDefinitionSlot(topic);
}
