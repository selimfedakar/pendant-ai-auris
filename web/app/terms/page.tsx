import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Terms of Service — Auris",
  description:
    "The terms that govern your use of the Auris pendant, app, and subscription.",
};

const SECTIONS: { h: string; body: React.ReactNode }[] = [
  {
    h: "Agreement",
    body: (
      <p>
        By reserving, purchasing, or using Auris — the pendant, the app, and the
        service behind them — you agree to these terms. If you don&apos;t agree,
        please don&apos;t use the product.
      </p>
    ),
  },
  {
    h: "The device and the subscription",
    body: (
      <p>
        Auris is sold as a one-time device ($199) plus a subscription ($14.99 /
        month) that powers transcription, reasoning, voice, and memory. The device
        is yours; the intelligence is a service that requires an active
        subscription to function. Pricing shown at reservation may be confirmed at
        launch.
      </p>
    ),
  },
  {
    h: "Acceptable use",
    body: (
      <ul>
        <li>Use Auris lawfully and respect the privacy of people around you.</li>
        <li>
          Follow local laws on recording — in some places all parties must consent.
        </li>
        <li>Don&apos;t attempt to reverse engineer, resell, or abuse the service.</li>
        <li>Don&apos;t use Auris to harass, surveil, or harm others.</li>
      </ul>
    ),
  },
  {
    h: "AI output",
    body: (
      <p>
        Auris generates responses with AI. It can be wrong, incomplete, or
        out of date. Don&apos;t rely on it for medical, legal, financial, or
        safety-critical decisions. You&apos;re responsible for how you act on what
        it tells you.
      </p>
    ),
  },
  {
    h: "Subscriptions & cancellation",
    body: (
      <p>
        Subscriptions renew automatically until cancelled. You can cancel any time;
        access continues through the end of the paid period. Without an active
        subscription, the cloud features stop working.
      </p>
    ),
  },
  {
    h: "Warranty & liability",
    body: (
      <p>
        Auris is provided &ldquo;as is.&rdquo; To the maximum extent permitted by
        law, we disclaim implied warranties and are not liable for indirect or
        consequential damages arising from use of the product or service.
      </p>
    ),
  },
  {
    h: "Changes",
    body: (
      <p>
        We may update these terms as the product evolves. Continued use after a
        change means you accept the updated terms.
      </p>
    ),
  },
  {
    h: "Contact",
    body: (
      <p>
        Questions about these terms? Email{" "}
        <a href="mailto:hello@aurisai.com" className="text-gold hover:text-glow">
          hello@aurisai.com
        </a>
        .
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Legal"
        title="Terms of Service"
        lead="The straightforward agreement that covers the device, the app, and the subscription behind them."
      />

      <section className="px-6 pb-10">
        <Reveal className="mx-auto max-w-2xl">
          <p className="text-sm text-muted/60">Effective {new Date().getFullYear()}</p>
        </Reveal>

        <div className="mx-auto mt-10 max-w-2xl space-y-12">
          {SECTIONS.map((s, i) => (
            <Reveal key={s.h} delay={Math.min(i, 4) * 0.04}>
              <div>
                <h2 className="font-display text-2xl font-semibold text-fg">
                  {s.h}
                </h2>
                <div className="mt-4 space-y-4 leading-relaxed text-muted [&_a]:underline [&_li]:ml-1 [&_strong]:font-medium [&_strong]:text-fg [&_ul]:list-disc [&_ul]:space-y-2.5 [&_ul]:pl-5">
                  {s.body}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}
