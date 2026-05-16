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
export const MIRO_SCHEDULE_LOWER_BOUND = "35 плановых публикаций в неделю";
export const MIRO_SCHEDULE_UPPER_BOUND = "5 плановых публикаций в день";
const SLOT_TOLERANCE_MINUTES = 75;

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
    "Валюты в начале недели",
    "Утром понедельника Миро ловит валютный и деловой ритм, чтобы задать тон всей неделе.",
  ),
  createSlot(
    1,
    "late_morning",
    "tech_world",
    "Технологии до полудня",
    "Ближе к полудню понедельника удобнее проверять технологические источники без утренней спешки.",
  ),
  createSlot(
    1,
    "day",
    "world",
    "Нейтральные мировые истории",
    "Дневное окно понедельника отдано нейтральным мировым историям, когда проще отделить факт от повестки.",
  ),
  createSlot(
    1,
    "late_day",
    "tech_world",
    "Технологии к вечеру",
    "Под конец понедельника технологические сдвиги легче читаются как реальное изменение привычек, а не как утренний анонс.",
  ),
  createSlot(
    1,
    "evening",
    "sports",
    "Спорт вечером",
    "Вечер понедельника отдан спорту: после рабочего дня проще увидеть не счет ради счета, а напряжение формы, серии или команды.",
  ),
  createSlot(
    2,
    "morning",
    "tech_world",
    "Технологии до обеда",
    "Во вторник утро начинается с технологий: к этому времени уже хватает свежих источников для отбора.",
  ),
  createSlot(
    2,
    "late_morning",
    "world",
    "Позднее мировое окно",
    "Во вторник к позднему утру мировые материалы проще читать без первой утренней суеты.",
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
    "Спорт ближе к вечеру",
    "Во вторник ближе к вечеру спорт разбавляет технологические, мировые и рыночные темы.",
  ),
  createSlot(
    2,
    "evening",
    "world",
    "Мировые истории вечером",
    "Вечером вторника лента возвращается к нейтральным мировым историям без резкой повестки.",
  ),
  createSlot(
    3,
    "morning",
    "world",
    "Утро внешнего мира",
    "Среда утром начинается с нейтральной мировой истории до рынков и технологий.",
  ),
  createSlot(
    3,
    "late_morning",
    "tech_world",
    "Поздние технологии",
    "Среда ближе к полудню подходит для технологических материалов без рекламной подачи раннего утра.",
  ),
  createSlot(
    3,
    "day",
    "sports",
    "Дневной спортивный срез",
    "Дневная среда держит спортивный слой, чтобы лента не скатывалась только в технологии, world и рынки.",
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
    "Технологии вечером",
    "Вечер среды оставлен под технологии, когда у дня уже накопился контекст.",
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
    "tech_world",
    "Дневной технологический поворот",
    "Днем четверга технологические истории лучше видны как бытовой сдвиг, а не как очередной громкий релиз.",
  ),
  createSlot(
    4,
    "late_day",
    "sports",
    "Спорт ближе к вечеру",
    "Четверг ближе к вечеру подходит для спортивных историй, где уже виден не только результат, но и изменение формы.",
  ),
  createSlot(
    4,
    "evening",
    "world",
    "Нейтральные истории вечером",
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
    "sports",
    "Спорт перед обедом",
    "Ближе к полудню пятницы спорт дает ленте живой ритм перед вечерним рынком и технологическим слоем.",
  ),
  createSlot(
    5,
    "day",
    "markets_fx",
    "Дневная валюта недели",
    "Днем пятницы валютный рынок показывает, как закрывается деловая неделя.",
  ),
  createSlot(
    5,
    "late_day",
    "tech_world",
    "Технологии перед вечером",
    "Перед вечером пятницы технологии лучше держат ощущение накопленного сдвига, чем еще один рынок на излете недели.",
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
    "tech_world",
    "Технологии в субботу",
    "Субботнее утро оставлено под технологии, когда особенно ясно видно, какие привычки уже ушли в повседневность.",
  ),
  createSlot(
    6,
    "late_morning",
    "world",
    "Мировые истории выходного дня",
    "К позднему утру субботы мир звучит тише и лучше подходит для спокойной фиксации.",
  ),
  createSlot(
    6,
    "day",
    "sports",
    "Выходной спортивный центр",
    "Днем субботы спорт естественно становится одной из главных тем дня.",
  ),
  createSlot(
    6,
    "late_day",
    "markets_crypto",
    "Крипта выходного дня",
    "Под вечер субботы крипта остается одним из немногих рынков, где ритм не выключается вместе с неделей.",
  ),
  createSlot(
    6,
    "evening",
    "world",
    "Выходной вечер мира",
    "Вечер субботы лучше заканчивать нейтральной мировой историей, а не резкой повесткой.",
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
    "tech_world",
    "Поздний техно-выходной",
    "К позднему утру воскресенья технологические материалы проще читать вне рабочей суеты.",
  ),
  createSlot(
    0,
    "day",
    "world",
    "Спокойный воскресный обзор",
    "Днем воскресенья лучше работают спокойные мировые материалы без паники и гонки.",
  ),
  createSlot(
    0,
    "late_day",
    "sports",
    "Поздний спортивный итог",
    "Под конец воскресного дня спорт помогает увидеть форму недели через команды, серии и человеческую динамику.",
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

export function getMiroActiveSlot(date: Date = new Date()): MiroScheduleSlot | undefined {
  return getActiveSlot(date);
}

export function getMiroDueScheduleSlots(
  date: Date = new Date(),
): readonly MiroScheduleSlot[] {
  const { weekday, totalMinutes } = getMinskParts(date);
  return getSlotsForWeekday(weekday).filter(
    (slot) => WINDOW_BOUNDS[slot.window].start <= totalMinutes,
  );
}

export function getMiroScheduleSlotKey(
  slot: Pick<MiroScheduleSlot, "weekday" | "window">,
): string {
  return `${slot.weekday}:${slot.window}`;
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
      "Сейчас пауза между плановыми окнами. В день есть до пяти проверок, ночью внеплановые публикации закрыты.",
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
      : "Сейчас ночная пауза. Срочные материалы откладываются до утра, если человек не принимает отдельное ручное решение.",
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
