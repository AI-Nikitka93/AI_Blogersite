interface PublishingRhythmProps {
  compact?: boolean;
}

export function PublishingRhythm({ compact }: PublishingRhythmProps) {
  return (
    <div className={`mt-8 p-6 border border-white/10 bg-white/5 rounded-3xl backdrop-blur-sm ${compact ? 'max-w-3xl mx-auto' : ''}`}>
      <h3 className="text-sm font-bold text-[color:var(--foreground)] uppercase tracking-[0.2em] mb-5 text-center">
        Расписание публикаций
      </h3>
      <div className="flex flex-wrap justify-center gap-4">
        {["Утро", "День", "Вечер", "Ночь"].map((slot) => (
          <div key={slot} className="px-5 py-2 rounded-full border border-white/10 bg-black/40 text-sm font-medium text-white/80 shadow-inner">
            {slot}
          </div>
        ))}
      </div>
    </div>
  );
}
