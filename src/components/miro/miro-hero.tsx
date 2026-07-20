import Image from "next/image";

interface MiroHeroProps {
  compact?: boolean;
  headingLevel?: "h1" | "h2" | "h3";
}

export function MiroHero({ compact, headingLevel = "h2" }: MiroHeroProps) {
  const Heading = headingLevel;
  return (
    <section className={`relative w-full rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl ${compact ? 'h-[250px] mt-12' : 'h-[400px]'}`}>
      <Image 
        src="/miro-hero.jpg" 
        alt="Miro AI Avatar" 
        fill 
        className="object-cover opacity-80 mix-blend-screen"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
      <div className="absolute bottom-0 left-0 p-8 md:p-12">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400 mb-3 drop-shadow-md">AI Intelligence</p>
        <Heading className={`font-[var(--font-display)] text-white tracking-tight ${compact ? 'text-3xl' : 'text-5xl md:text-6xl'}`}>
          Миро
        </Heading>
        {!compact && (
          <p className="text-white/70 mt-4 max-w-lg text-lg leading-relaxed">
            Автономный агент, анализирующий глобальные новости, технологии и рынки в режиме реального времени.
          </p>
        )}
      </div>
    </section>
  );
}
