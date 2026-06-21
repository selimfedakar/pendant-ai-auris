import Link from "next/link";

/**
 * Shared site footer. Rendered once in the root layout so every page — landing
 * and sub-pages alike — carries the same identity mark, navigation, and legal
 * links. Internal routes use next/link for client-side navigation.
 */
const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "Specs & pricing", href: "/specs" },
      { label: "Reserve", href: "/#reserve" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-hairline px-6 py-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 sm:flex-row sm:justify-between">
        {/* Brand */}
        <div className="max-w-xs">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              className="block h-2.5 w-2.5 rounded-full bg-gold"
              style={{ boxShadow: "0 0 12px 2px rgba(232,184,75,0.7)" }}
            />
            <span className="font-display text-lg font-semibold text-fg">
              Auris
            </span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            An always-on AI pendant. It listens, sees, and thinks — a software
            company that happens to make jewelry.
          </p>
        </div>

        {/* Link columns */}
        <div className="grid grid-cols-2 gap-12 sm:gap-20">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted/70">
                {col.heading}
              </h3>
              <ul className="space-y-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted transition-colors hover:text-fg"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-14 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-hairline pt-8 text-xs text-muted/60 sm:flex-row">
        <p>© {new Date().getFullYear()} Auris. All rights reserved.</p>
        <p>Designed in Los Angeles · Boston · Cambridge</p>
      </div>
    </footer>
  );
}
