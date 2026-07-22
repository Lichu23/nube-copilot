import Link from "next/link";
import { ExternalLink, Mail, Sparkles } from "lucide-react";

const supportEmail = "landingchee@gmail.com";
const githubUrl = "https://github.com/Lichu23";

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-border bg-card/80 px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-2 font-medium text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            NubeCopilot
          </span>
          <p>© 2026 NubeCopilot. Creado para tiendas Tiendanube.</p>
        </div>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/terms" className="transition hover:text-foreground">
            Términos
          </Link>
          <Link href="/privacy" className="transition hover:text-foreground">
            Privacidad
          </Link>
          <a href={`mailto:${supportEmail}`} className="inline-flex items-center gap-1.5 transition hover:text-foreground">
            <Mail className="h-4 w-4" />
            Soporte
          </a>
          <a href={githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 transition hover:text-foreground">
            <ExternalLink className="h-4 w-4" />
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
