import type { Metadata } from "next";
import Image from "next/image";
import PageHeader from "@/components/PageHeader";
import PageCta from "@/components/PageCta";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "About — Auris",
  description:
    "Auris is a software company that happens to make jewelry. Our mission, our principles, and the people building an ambient AI you can wear.",
};

const PRINCIPLES = [
  {
    title: "Presence over screens",
    body: "Auris exists so you can look up. The best interface is the one you forget you're wearing.",
  },
  {
    title: "Hardware is the smallest part",
    body: "The pendant is a sensor. The product is the software and the intelligence behind it — and that's where we invest.",
  },
  {
    title: "Private by architecture",
    body: "We keep the device dumb and your control explicit. You can see what's stored and delete all of it, any time.",
  },
];

type TeamLink = {
  type: "github" | "linkedin" | "website";
  href: string;
  label: string;
  featured?: boolean;
};

const TEAM: {
  name: string;
  role: string;
  place: string;
  photo: string;
  body: string;
  links: TeamLink[];
}[] = [
  {
    name: "Mete Selçuk Şimşek",
    role: "Co-founder & CEO",
    place: "Boston",
    photo: "/team/mete.jpeg",
    body: "The driving force behind Auris's vision and commercial execution. He shapes the product story and the brand, and leads investor relations, partnerships, and go-to-market — and he had the first working prototype on day one.",
    links: [],
  },
  {
    name: "Ahmet Selim Fedakar",
    role: "Co-founder & CTO",
    place: "Los Angeles",
    photo: "/team/selim.jpeg",
    body: "Translates a complex architecture into something you simply wear. He leads Auris's entire technical stack — the device integration, the voice pipelines, and the app that ties the pendant to the cloud. If it boots, listens, or connects, he built it.",
    links: [
      { type: "github", href: "https://github.com/selimfedakar", label: "GitHub", featured: true },
      { type: "linkedin", href: "https://www.linkedin.com/in/ahmet-selim-fedakar/", label: "LinkedIn" },
    ],
  },
  {
    name: "Atilla Kaan Alkan",
    role: "Co-founder & CSO",
    place: "Harvard — Cambridge, MA",
    photo: "/team/atilla.jpeg",
    body: "Owns the intelligence behind Auris. He designs the model architecture, fine-tunes the foundation models on the voice and vision pipelines, and works out the compute trade-offs that let ambient understanding run fast, cheap, and reliably at scale. An NLP PhD now doing AI research at the Harvard-Smithsonian Center for Astrophysics, he's the mind behind the voice.",
    links: [
      { type: "github", href: "https://github.com/AtillaKaanAlkan", label: "GitHub", featured: true },
      { type: "website", href: "https://atillaalkan.com/", label: "Website" },
      { type: "linkedin", href: "https://www.linkedin.com/in/atilla-kaan-alkan-081b65194/", label: "LinkedIn" },
    ],
  },
];

const LinkedInIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.3-.02-2.96-1.8-2.96-1.8 0-2.08 1.4-2.08 2.86V21h-4z" />
  </svg>
);

const GitHubIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .5a11.5 11.5 0 00-3.64 22.42c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.79 1.2 1.79 1.2 1.04 1.79 2.73 1.27 3.4.97.1-.76.41-1.27.74-1.56-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 015.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.26 5.69.42.36.8 1.08.8 2.18v3.23c0 .31.21.67.8.56A11.5 11.5 0 0012 .5z" />
  </svg>
);

const WebsiteIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" />
    <path d="M2.5 12h19M12 2.5c2.6 2.6 4 6 4 9.5s-1.4 6.9-4 9.5c-2.6-2.6-4-6-4-9.5s1.4-6.9 4-9.5z" />
  </svg>
);

const StarBadge = () => (
  <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-base shadow-[0_0_8px_rgba(232,184,75,0.55)]">
    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 7.1-1.01L12 2z" />
    </svg>
  </span>
);

const LinkIcon = ({ type }: { type: TeamLink["type"] }) =>
  type === "github" ? <GitHubIcon /> : type === "linkedin" ? <LinkedInIcon /> : <WebsiteIcon />;

export default function AboutPage() {
  return (
    <main>
      <PageHeader
        eyebrow="About"
        title="A software company. It happens to make jewelry."
        lead="We're building an ambient intelligence you wear — something that listens, sees, and thinks, so technology can finally get out of your way."
      />

      {/* Story */}
      <section className="px-6 py-12">
        <Reveal className="mx-auto max-w-2xl space-y-6 text-lg leading-relaxed text-muted">
          <p>
            Every assistant so far has lived behind glass. You pull out a phone,
            you tap, you type, you look down. Auris started from a simple
            frustration: the moment you reach for a screen, you've left the room
            you were in.
          </p>
          <p>
            So we put the sensors in a pendant and the intelligence everywhere
            else. The thing on your chest is deliberately simple — a microphone, a
            camera, a speaker. The brain is the app in your pocket. The heavy
            lifting happens in the cloud. What you experience is just{" "}
            <span className="text-fg">a voice that already knows the context</span>.
          </p>
          <p>
            We think the next decade of computing is ambient: always available,
            rarely demanding your eyes. Auris is our first attempt at building it
            for real.
          </p>
        </Reveal>
      </section>

      {/* Principles */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              What we believe
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <div className="h-full rounded-2xl border border-hairline bg-panel/40 p-8">
                  <h3 className="font-display text-xl font-semibold text-fg">
                    {p.title}
                  </h3>
                  <p className="mt-4 text-muted">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.22em] text-gold">
              Who&apos;s building it
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
              A small team, a working prototype.
            </h2>
            <p className="mt-4 max-w-2xl text-muted">
              No outsourcing, no slideware — Auris is built by the people you&apos;d
              talk to about it.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {TEAM.map((m, i) => (
              <Reveal key={m.name} delay={i * 0.08}>
                <div className="flex h-full flex-col rounded-2xl border border-hairline bg-panel/40 p-8">
                  <div className="h-[72px] w-[72px] overflow-hidden rounded-full ring-1 ring-hairline">
                    <Image
                      src={m.photo}
                      alt={m.name}
                      width={72}
                      height={72}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <h3 className="mt-6 font-display text-xl font-semibold text-fg">
                    {m.name}
                  </h3>
                  <p className="mt-1 text-sm text-gold">{m.role}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted/70">
                    {m.place}
                  </p>
                  <p className="mt-4 text-sm text-muted">{m.body}</p>
                  {m.links.length > 0 && (
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      {m.links.map((link) =>
                        link.featured ? (
                          <a
                            key={link.type}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold/10 px-3.5 py-1.5 font-mono text-xs font-medium text-fg shadow-[0_0_14px_rgba(232,184,75,0.18)] transition-colors hover:border-gold hover:bg-gold/20"
                          >
                            <StarBadge />
                            <LinkIcon type={link.type} /> {link.label}
                          </a>
                        ) : (
                          <a
                            key={link.type}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-hairline px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-gold hover:text-fg"
                          >
                            <LinkIcon type={link.type} /> {link.label}
                          </a>
                        )
                      )}
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <PageCta />
    </main>
  );
}
