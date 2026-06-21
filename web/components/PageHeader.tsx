import SoundRings from "@/components/SoundRings";
import Reveal from "@/components/Reveal";

/**
 * Consistent header for every sub-page: clears the fixed nav, sets an eyebrow,
 * a large display title, and an optional lead paragraph, over a faint sound-ring
 * glow so the brand motif carries onto interior pages.
 */
export default function PageHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <header className="relative overflow-hidden px-6 pb-16 pt-40 text-center sm:pt-48">
      <div className="pointer-events-none absolute inset-x-0 top-0 grid h-[420px] place-items-center">
        <SoundRings size={620} rings={3} className="scale-50 opacity-40 sm:scale-75" />
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 30%, transparent 30%, var(--color-base) 70%)",
        }}
      />

      <Reveal className="relative z-10 mx-auto max-w-3xl">
        <span className="font-display text-xs uppercase tracking-[0.25em] text-gold">
          {eyebrow}
        </span>
        <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-fg sm:text-6xl">
          {title}
        </h1>
        {lead && (
          <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-muted">
            {lead}
          </p>
        )}
      </Reveal>
    </header>
  );
}
