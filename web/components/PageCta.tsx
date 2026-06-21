import Reveal from "@/components/Reveal";
import ReserveForm from "@/components/ReserveForm";

/**
 * Closing call-to-action reused at the foot of the sub-pages. Mirrors the landing
 * reserve moment with a tighter footprint so interior pages always end on the
 * waitlist.
 */
export default function PageCta({
  title = "Reserve your Auris.",
  subtitle = "$199 device, then $14.99 / month for the intelligence behind it.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="px-6 py-28">
      <Reveal className="mx-auto max-w-2xl rounded-3xl border border-hairline bg-panel/40 px-6 py-14 text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-md text-muted">{subtitle}</p>
        <div className="mt-9">
          <ReserveForm />
        </div>
      </Reveal>
    </section>
  );
}
