import type { Metadata } from "next";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Privacy Policy — Auris",
  description:
    "How Auris collects, processes, stores, and protects your data — and the controls you have over it.",
};

const SECTIONS: { h: string; body: React.ReactNode }[] = [
  {
    h: "The short version",
    body: (
      <>
        <p>
          Auris is designed so the device you wear holds no intelligence and no
          memory. Audio and images are captured on the pendant, relayed through
          your phone, and processed by AI services to produce a reply. We store
          only a short rolling history so conversations feel continuous, and you
          can delete all of it at any time.
        </p>
      </>
    ),
  },
  {
    h: "What we collect",
    body: (
      <ul>
        <li>
          <strong>Voice audio</strong> — recorded when you engage Auris, sent for
          transcription and a reply.
        </li>
        <li>
          <strong>Images</strong> — only when you trigger the camera for vision
          analysis.
        </li>
        <li>
          <strong>Conversation content</strong> — transcripts and replies, kept as
          a short rolling history (the most recent messages) so Auris remembers
          context.
        </li>
        <li>
          <strong>Optional context you connect</strong> — calendar events and, if
          you opt in, recent email subjects, used only to answer with context.
        </li>
        <li>
          <strong>A device identifier</strong> — an access code or anonymous ID
          that ties your history to your pendant.
        </li>
      </ul>
    ),
  },
  {
    h: "How it's processed",
    body: (
      <>
        <p>
          To turn speech into an answer, Auris uses specialist AI providers as data
          processors:
        </p>
        <ul>
          <li>
            <strong>Speech-to-text</strong> and <strong>voice synthesis</strong> —
            transcription and spoken replies.
          </li>
          <li>
            <strong>Language model</strong> — reasoning over your transcript and
            recent context to generate a reply.
          </li>
          <li>
            <strong>Cloud infrastructure</strong> — request handling and the
            encrypted memory store.
          </li>
        </ul>
        <p>
          These providers process your data on our behalf to deliver the feature
          you asked for. We do not sell your data, and we do not use your
          conversations to advertise to you.
        </p>
      </>
    ),
  },
  {
    h: "What we store, and for how long",
    body: (
      <p>
        We retain a short rolling window of your most recent conversation history
        so Auris stays contextual — older messages roll off automatically. Optional
        connected context (calendar, email) is read at the moment of a request and
        is not retained as a separate copy. Access tokens for connected accounts
        are stored securely on your device, not on our servers.
      </p>
    ),
  },
  {
    h: "Your controls",
    body: (
      <ul>
        <li>
          <strong>Delete everything</strong> — &ldquo;Clear All Data&rdquo; in the
          app wipes your stored conversation history from our servers.
        </li>
        <li>
          <strong>Disconnect context</strong> — calendar and email access can be
          revoked at any time; tokens are removed from your device.
        </li>
        <li>
          <strong>Stop collection</strong> — Auris only records when engaged; you
          control when it listens.
        </li>
      </ul>
    ),
  },
  {
    h: "Security",
    body: (
      <p>
        Requests to our services are authenticated, account tokens are held in your
        device&apos;s secure keychain, and stored history is access-controlled. No
        system is perfectly secure, but we keep the surface small by design — the
        pendant itself stores nothing.
      </p>
    ),
  },
  {
    h: "Children",
    body: (
      <p>
        Auris is not directed to children under 13, and we do not knowingly collect
        their data.
      </p>
    ),
  },
  {
    h: "Changes",
    body: (
      <p>
        We may update this policy as the product evolves. Material changes will be
        reflected here with a new effective date.
      </p>
    ),
  },
  {
    h: "Contact",
    body: (
      <p>
        Questions about your data? Email{" "}
        <a href="mailto:privacy@aurisai.com" className="text-gold hover:text-glow">
          privacy@aurisai.com
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <main>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        lead="The pendant is dumb on purpose. Here's exactly what leaves it, where it goes, and how you stay in control."
      />

      <section className="px-6 pb-10">
        <Reveal className="mx-auto max-w-2xl">
          <p className="text-sm text-muted/60">Effective {new Date().getFullYear()}</p>
        </Reveal>

        <div className="mx-auto mt-10 max-w-2xl space-y-12">
          {SECTIONS.map((s, i) => (
            <Reveal key={s.h} delay={Math.min(i, 4) * 0.04}>
              <div className="legal">
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
