import Link from "next/link";
import { ArrowRight, BarChart3, LockKeyhole, MessageSquare, PackageSearch, ShieldCheck, ShoppingBag, Sparkles, Store, Users } from "lucide-react";

const howItWorks = [
  {
    icon: Store,
    step: "01",
    title: "Conectá Tiendanube",
    body: "Un clic para autorizar la lectura de tu tienda, productos, variantes y pedidos recientes.",
  },
  {
    icon: Sparkles,
    step: "02",
    title: "Contanos tus objetivos",
    body: "El analista aprende qué querés mejorar y qué decisiones te cuestan más tiempo.",
  },
  {
    icon: MessageSquare,
    step: "03",
    title: "Preguntá y analizá",
    body: "Conversás con el analista y abrís un canvas visual con métricas, riesgos y próximos pasos.",
  },
];

const dataAccess = [
  { icon: Store, title: "Perfil de tienda", body: "Nombre, pa?s, moneda e idioma." },
  { icon: PackageSearch, title: "Productos y variantes", body: "SKU, precios, stock y estado de publicación." },
  { icon: BarChart3, title: "Pedidos recientes", body: "Totales, estados, items y fechas de los últimos 90 días." },
  { icon: ShoppingBag, title: "Items de pedidos", body: "Cantidades, precios unitarios y totales calculados." },
  { icon: Users, title: "Señales de clientes", body: "Contactos anonimizados antes de guardarse." },
  { icon: ShieldCheck, title: "Solo lectura", body: "Sin permisos de escritura. Podés revocar el acceso cuando quieras." },
];

function BrandMark() {
  return (
    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink-navy !text-white shadow-soft">
      <Sparkles className="h-4.5 w-4.5" />
    </div>
  );
}

function ProductPreview() {
  const bars = ["h-14", "h-20", "h-16", "h-24", "h-28", "h-18"];

  return (
    <section className="mx-auto mt-12 w-full max-w-6xl overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-border-strong" />
          <span className="h-3 w-3 rounded-full bg-border-strong" />
          <span className="h-3 w-3 rounded-full bg-border-strong" />
          <span className="ml-4 text-sm text-muted-foreground">Chat + Canvas de an?lisis</span>
        </div>
        <span className="hidden rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success sm:inline-flex">
          Datos de tienda en vivo
        </span>
      </div>

      <div className="grid min-h-[24rem] gap-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="border-b border-border bg-surface-muted/40 p-5 text-left lg:border-b-0 lg:border-r">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-soft">
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
            Conversación guiada
          </div>

          <div className="space-y-4">
            <div className="ml-auto max-w-[17rem] rounded-[1.25rem] rounded-tr-sm bg-ink-navy px-4 py-3 text-sm leading-6 text-white">
              ¿Qué productos explican la suba de ventas esta semana?
            </div>

            <div className="max-w-sm rounded-[1.25rem] rounded-tl-sm border border-border bg-card p-4 shadow-soft">
              <p className="text-sm leading-6 text-foreground">
                La facturación subió <strong>18%</strong>. El crecimiento viene de tres SKUs, pero dos variantes quedan bajo el umbral de reposición.
              </p>
              <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                Abrir canvas
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="max-w-[18rem] rounded-[1.25rem] rounded-tl-sm border border-border bg-card p-4 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Próxima acción</p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                Reponer 24 unidades del SKU Aurora-M y revisar el margen del combo más vendido.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card p-5 text-left">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Canvas de an?lisis</p>
              <h3 className="mt-1 text-xl font-semibold text-foreground">Ventas semanales y riesgo de stock</h3>
            </div>
            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">últimos 7 días</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["$12,48k", "Facturaci?n", "+18%"],
              ["318", "Pedidos", "+9%"],
              ["2", "Riesgos", "stock"],
            ].map(([value, label, delta]) => (
              <div key={label} className="rounded-[1rem] border border-border bg-surface-muted px-4 py-3">
                <p className="font-display text-2xl leading-none text-heading-ink">{value}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                  <span className="text-xs font-semibold text-success">{delta}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[1.25rem] border border-border bg-card p-4 shadow-soft">
              <div className="flex items-end gap-2 border-b border-border pb-4">
                {bars.map((height, index) => (
                  <div key={`${height}-${index}`} className="flex flex-1 items-end rounded-full bg-accent">
                    <div className={`${height} w-full rounded-full bg-primary/80`} />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>Lun</span>
                <span>Mié</span>
                <span>Vie</span>
                <span>Dom</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-[1rem] border border-border bg-surface-muted p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Top producto</p>
                <p className="mt-2 font-semibold text-foreground">Campera Aurora</p>
                <p className="text-sm text-success">+32% vs semana anterior</p>
              </div>
              <div className="rounded-[1rem] border border-border bg-warning/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Alerta</p>
                <p className="mt-2 font-semibold text-foreground">Reposición en 48 h</p>
                <p className="text-sm text-muted-foreground">2 variantes pueden quedarse sin stock.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 mx-auto h-[32rem] max-w-4xl rounded-full bg-accent/70 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
        <Link href="/" className="inline-flex items-center gap-3">
          <BrandMark />
          <span className="font-semibold text-foreground">NubeCopilot</span>
          <span className="text-sm text-muted-foreground">para Tiendanube</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#como-funciona" className="transition hover:text-foreground">Cómo funciona</a>
          <a href="#tus-datos" className="transition hover:text-foreground">Tus datos</a>
          <Link href="/chat" className="transition hover:text-foreground">Iniciar sesi?n</Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-16 pt-14 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-soft">
          <Store className="h-4 w-4 text-primary" />
          Creado para dueños de tiendas Tiendanube
        </div>

        <h1 className="font-display mx-auto mt-8 max-w-4xl text-[4.25rem] leading-[0.92] tracking-[-0.055em] text-heading-ink md:text-[5.7rem]">
          El analista IA detrás de <span className="italic text-primary">cada decisión</span> de tu tienda.
        </h1>
        <p className="mx-auto mt-8 max-w-2xl text-xl leading-8 text-muted-foreground">
          NubeCopilot lee ventas, inventario, productos y clientes para decirte qué funciona, qué está en riesgo y qué hacer después. Sin planillas.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/connect" className="inline-flex items-center gap-2 rounded-[1rem] btn-ink px-7 py-4 text-sm font-semibold shadow-card transition">
            Conectar tienda
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#como-funciona" className="inline-flex rounded-[1rem] px-5 py-4 text-sm font-medium text-muted-foreground transition hover:text-foreground">
            Ver cómo funciona
          </a>
        </div>

        <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <LockKeyhole className="h-4 w-4" />
          Acceso solo lectura ? Desconectá cuando quieras
        </p>

        <ProductPreview />
      </section>

      <section id="como-funciona" className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.24em] text-primary">Cómo funciona</p>
        <h2 className="font-display mx-auto mt-4 max-w-3xl text-center text-[3.6rem] leading-none tracking-[-0.05em] text-heading-ink">
          De conexión a claridad en minutos.
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {howItWorks.map((item) => (
            <article key={item.title} className="rounded-[1.5rem] border border-border bg-card p-6 shadow-soft">
              <div className="flex items-start justify-between gap-6">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[0.9rem] bg-muted text-ink-navy">
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="font-display text-3xl text-muted-foreground">{item.step}</span>
              </div>
              <h3 className="mt-8 text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="mt-3 text-base leading-7 text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="tus-datos" className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.24em] text-primary">Tus datos</p>
        <h2 className="font-display mx-auto mt-4 max-w-3xl text-center text-[3.6rem] leading-none tracking-[-0.05em] text-heading-ink">
          Solo lo necesario para responder bien.
        </h2>
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dataAccess.map((item) => (
            <article key={item.title} className="flex items-start gap-4 rounded-[1.35rem] border border-border bg-card p-5 shadow-soft">
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-accent text-accent-foreground">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        <div className="flex flex-col gap-8 rounded-[1.75rem] bg-ink-navy px-8 py-10 !text-white shadow-pop md:flex-row md:items-center md:justify-between md:px-14">
          <div>
            <h2 className="font-display text-[2.8rem] leading-none tracking-[-0.05em]">¿Listo para poner tu tienda bajo control?</h2>
            <p className="mt-4 text-base text-white/75">Conectá Tiendanube y recibí los primeros insights con datos reales.</p>
          </div>
          <Link href="/connect" className="inline-flex w-fit items-center gap-2 rounded-[1rem] bg-white px-7 py-4 text-sm font-semibold !text-ink-navy transition hover:bg-accent">
            Empezar
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border bg-card/80 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> NubeCopilot · Creado para Tiendanube</span>
          <span>© 2026 NubeCopilot. Todos los derechos reservados.</span>
        </div>
      </footer>
    </main>
  );
}
