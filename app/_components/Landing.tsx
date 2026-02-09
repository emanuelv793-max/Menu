"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LeadForm from "./LeadForm";

type Lang = "es" | "en";

type LandingProps = {
  demoHref: string;
  initialLang?: string;
};

const LANG_KEY = "domus_lang";

const translations = {
  es: {
    nav: {
      ariaLabel: "Secciones principales",
      how: "Cómo funciona",
      include: "Qué incluye",
      pricing: "Precios",
      faq: "FAQ",
    },
    hero: {
      badge: "Piloto gratis 15 días",
      title: "Pedidos desde mesa, directo a cocina.",
      subtitle:
        "Convierte tu QR en un sistema de pedidos que reduce esperas y errores en sala, sin tablets ni apps.",
      chips: ["Sin tarjeta", "Instalación incluida", "Cancelación fácil"],
      ctaPrimary: "Activar piloto gratis 15 días",
      ctaSecondary: "Ver demo (30 segundos)",
    },
    heroCard: {
      badge: "Domus",
      title: "Control total sin fricción",
      copy: "Un panel para cocina y sala con estados claros, extras y métricas para saber qué funciona.",
      pills: [
        "Tiempo real: pedidos al instante",
        "Ticket medio más alto con extras visibles",
        "Menos errores al tomar pedidos",
      ],
    },
    problem: {
      title:
        "En hora punta, el cuello de botella no es la cocina: es la toma de pedidos.",
      bullets: [
        "Esperas para pedir = menos rotación",
        "Errores al transmitir pedidos = devoluciones y estrés",
        "Extras olvidados = dinero perdido",
      ],
    },
    solution: {
      title: "La solución con Domus",
      cards: [
        {
          title: "Más rotación en horas pico",
          copy: "Los clientes piden sin esperar al camarero.",
        },
        {
          title: "Menos errores en cocina",
          copy: "Pedido claro por mesa con extras y opciones ‘sin’.",
        },
        {
          title: "Mayor ticket medio",
          copy: "Extras visibles y sugerencias sin presionar al equipo.",
        },
      ],
    },
    forWho: {
      title: "¿Para quién es Domus?",
      subtitle:
        "Especialmente útil para restaurantes con alto volumen o picos de servicio.",
      bullets: [
        "Bares y restaurantes con terraza",
        "Hamburgueserías, pizzerías y gastrobares",
        "Locales con picos fuertes en horas punta",
      ],
    },
    howItWorks: {
      title: "Cómo funciona",
      steps: [
        "Escanean el QR y eligen platos.",
        "Confirman el pedido (mesa, extras/sin).",
        "Cocina recibe el ticket al instante y actualiza el estado.",
      ],
    },
    visuals: {
      title: "Así se ve Domus en el día a día",
      menuAlt: "Captura menú (móvil)",
      kitchenAlt: "Panel de cocina",
      menuCaption: "El cliente pide desde su móvil",
      kitchenCaption: "Cocina recibe pedidos en tiempo real",
    },
    includes: {
      title: "Qué incluye",
      items: [
        "Menú QR + enlace web",
        "Pedidos por mesa con carrito",
        "Panel de cocina en tiempo real",
        "Extras y opciones ‘sin’ por producto",
        "Caja y métricas básicas",
        "Exportación CSV",
        "Instalación guiada incluida",
      ],
    },
    pricing: {
      title: "Precios",
      badge: "Piloto gratis 15 días (sin tarjeta)",
      featuredLabel: "Plan destacado",
      featuredName: "Domus Pro — 39 €/mes",
      featuredCopy: "Todo incluido: menú + pedidos + cocina + caja",
      anchorLabel: "Plan ancla",
      anchorName: "Domus Menu — 15 €/mes",
      anchorCopy: "Solo menú QR (sin pedidos)",
      ctaPrimary: "Activar piloto gratis 15 días",
      ctaSecondary: "Ver demo",
      pdf: "Descargar PDF",
      note:
        "Domus funciona de forma independiente. No sustituye tu TPV actual y no requiere integraciones para empezar.",
    },
    faq: {
      title: "FAQ",
      items: [
        {
          q: "¿Necesito WiFi?",
          a: "Recomendado, pero el cliente puede usar datos.",
        },
        {
          q: "¿Se integra con POS?",
          a: "Por ahora funciona independiente; integraciones bajo demanda.",
        },
        {
          q: "¿Cuánto tarda en estar listo?",
          a: "Rápido si ya tienes la carta.",
        },
        {
          q: "¿Puedo cambiar productos y precios?",
          a: "Sí, desde el panel.",
        },
        {
          q: "¿Qué pasa si no me convence?",
          a: "Cancelas antes del día 15.",
        },
      ],
    },
    cta: {
      title: "Pruébalo 15 días y decide con datos.",
      subtitle: "Menos esperas. Menos errores. Mejor servicio.",
      bullets: [
        "Respuesta rápida en WhatsApp.",
        "Setup guiado y acompañamiento.",
        "Cancelación fácil antes del día 15.",
      ],
    },
    leadForm: {
      labels: {
        name: "Nombre",
        restaurant: "Restaurante",
        city: "Ciudad",
        whatsapp: "WhatsApp",
        tables: "Nº de mesas (aprox.)",
      },
      placeholders: {
        name: "Tu nombre",
        restaurant: "Nombre del restaurante",
        city: "Ciudad",
        whatsapp: "+34 600 000 000",
        tables: "Ej. 18",
      },
      submit: "Activar piloto gratis 15 días",
      helper: "Al enviar se abrirá WhatsApp con el mensaje pre-rellenado.",
      message: (state: {
        name: string;
        restaurant: string;
        city: string;
        whatsapp: string;
        tables: string;
      }) =>
        `Hola, soy ${state.name}. Restaurante: ${state.restaurant} (Ciudad: ${state.city}). Mesas: ${state.tables}. Quiero activar el piloto gratis 15 días de Domus.`,
    },
    toggle: {
      label: "Idioma",
      es: "ES",
      en: "EN",
    },
  },
  en: {
    nav: {
      ariaLabel: "Main sections",
      how: "How it works",
      include: "What's included",
      pricing: "Pricing",
      faq: "FAQ",
    },
    hero: {
      badge: "15-day free pilot",
      title: "Orders from table, straight to the kitchen.",
      subtitle:
        "Turn your QR into an ordering system that reduces waits and errors on the floor, without tablets or apps.",
      chips: ["No card", "Setup included", "Easy cancellation"],
      ctaPrimary: "Activate 15-day free pilot",
      ctaSecondary: "View demo (30 seconds)",
    },
    heroCard: {
      badge: "Domus",
      title: "Frictionless control",
      copy: "A kitchen + floor dashboard with clear statuses, extras, and metrics to see what works.",
      pills: [
        "Real time: orders instantly",
        "Higher average ticket with visible extras",
        "Fewer mistakes when taking orders",
      ],
    },
    problem: {
      title:
        "At peak hours, the bottleneck isn’t the kitchen: it’s taking orders.",
      bullets: [
        "Waiting to order = lower turnover",
        "Order mistakes = refunds and stress",
        "Forgotten extras = lost revenue",
      ],
    },
    solution: {
      title: "The Domus solution",
      cards: [
        {
          title: "More turnover at peak times",
          copy: "Guests order without waiting for the server.",
        },
        {
          title: "Fewer errors in the kitchen",
          copy: "Clear per-table tickets with extras and ‘no’ options.",
        },
        {
          title: "Higher average ticket",
          copy: "Visible extras and suggestions without pressuring the team.",
        },
      ],
    },
    forWho: {
      title: "Who is Domus for?",
      subtitle: "Especially useful for restaurants with high volume or peak periods.",
      bullets: [
        "Bars and restaurants with terrace seating",
        "Burger joints, pizzerias, and gastrobars",
        "Venues with strong peak-hour demand",
      ],
    },
    howItWorks: {
      title: "How it works",
      steps: [
        "They scan the QR and choose dishes.",
        "They confirm the order (table, extras/no).",
        "The kitchen receives the ticket instantly and updates the status.",
      ],
    },
    visuals: {
      title: "Domus in action",
      menuAlt: "Menu capture (mobile)",
      kitchenAlt: "Kitchen panel",
      menuCaption: "Guests order from their phone",
      kitchenCaption: "Kitchen receives orders in real time",
    },
    includes: {
      title: "What's included",
      items: [
        "QR menu + web link",
        "Table ordering with cart",
        "Real-time kitchen dashboard",
        "Extras and ‘no’ options per item",
        "Cashier and basic metrics",
        "CSV export",
        "Guided installation included",
      ],
    },
    pricing: {
      title: "Pricing",
      badge: "15-day free pilot (no card)",
      featuredLabel: "Featured plan",
      featuredName: "Domus Pro — €39 / month",
      featuredCopy: "All-in: menu + ordering + kitchen + cashier",
      anchorLabel: "Anchor plan",
      anchorName: "Domus Menu — €15 / month",
      anchorCopy: "QR menu only (no ordering)",
      ctaPrimary: "Activate 15-day free pilot",
      ctaSecondary: "View demo",
      pdf: "Download PDF",
      note:
        "Domus runs independently. It doesn’t replace your POS and doesn’t require integrations to start.",
    },
    faq: {
      title: "FAQ",
      items: [
        {
          q: "Do I need WiFi?",
          a: "Recommended, but guests can use mobile data.",
        },
        {
          q: "Does it integrate with POS?",
          a: "For now it works independently; integrations on request.",
        },
        {
          q: "How long until it’s ready?",
          a: "Fast if you already have the menu.",
        },
        {
          q: "Can I change products and prices?",
          a: "Yes, from the dashboard.",
        },
        {
          q: "What if I’m not convinced?",
          a: "Cancel before day 15.",
        },
      ],
    },
    cta: {
      title: "Try it for 15 days and decide with data.",
      subtitle: "Less waiting. Fewer errors. Better service.",
      bullets: [
        "Fast WhatsApp response.",
        "Guided setup and onboarding.",
        "Easy cancellation before day 15.",
      ],
    },
    leadForm: {
      labels: {
        name: "Name",
        restaurant: "Restaurant",
        city: "City",
        whatsapp: "WhatsApp",
        tables: "Tables (approx.)",
      },
      placeholders: {
        name: "Your name",
        restaurant: "Restaurant name",
        city: "City",
        whatsapp: "+34 600 000 000",
        tables: "e.g. 18",
      },
      submit: "Activate 15-day free pilot",
      helper: "Submitting will open WhatsApp with a pre-filled message.",
      message: (state: {
        name: string;
        restaurant: string;
        city: string;
        whatsapp: string;
        tables: string;
      }) =>
        `Hi, I'm ${state.name}. Restaurant: ${state.restaurant} (City: ${state.city}). Tables: ${state.tables}. I want to activate the 15-day free pilot of Domus.`,
    },
    toggle: {
      label: "Language",
      es: "ES",
      en: "EN",
    },
  },
} as const;

const isLang = (value?: string | null): value is Lang => value === "es" || value === "en";

const readCookie = (name: string) => {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((part) => part.trim());
  const found = parts.find((part) => part.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.split("=")[1]) : null;
};

export default function Landing({ demoHref, initialLang }: LandingProps) {
  const [lang, setLang] = useState<Lang>(isLang(initialLang) ? initialLang : "es");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(LANG_KEY) : null;
    const cookieLang = readCookie(LANG_KEY);
    const nextLang = isLang(stored) ? stored : isLang(cookieLang) ? cookieLang : null;
    if (nextLang) {
      setLang(nextLang);
    }
  }, []);

  const updateLang = (nextLang: Lang) => {
    setLang(nextLang);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANG_KEY, nextLang);
    }
    document.cookie = `${LANG_KEY}=${encodeURIComponent(nextLang)}; path=/; max-age=31536000`;
  };

  const t = translations[lang];

  return (
    <div className="page" lang={lang}>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <img
              className="brand-logo"
              src="/brand/domus-logo-horizontal.svg"
              alt="Domus"
            />
            <img
              className="brand-icon brand-icon-default"
              src="/brand/domus-icon.svg"
              alt="Domus"
            />
            <img
              className="brand-icon brand-icon-dark"
              src="/brand/domus-icon-dark.svg"
              alt="Domus"
            />
            <img
              className="brand-icon brand-icon-light"
              src="/brand/domus-icon-light.svg"
              alt="Domus"
            />
          </div>
          <div className="topbar-actions">
            <nav className="topbar-nav" aria-label={t.nav.ariaLabel}>
              <a className="nav-link" href="#como-funciona">
                {t.nav.how}
              </a>
              <a className="nav-link" href="#que-incluye">
                {t.nav.include}
              </a>
              <a className="nav-link" href="#precios">
                {t.nav.pricing}
              </a>
              <a className="nav-link" href="#faq">
                {t.nav.faq}
              </a>
            </nav>
            <div className="lang-toggle" role="group" aria-label={t.toggle.label}>
              <button
                type="button"
                className={`lang-button${lang === "es" ? " active" : ""}`}
                onClick={() => updateLang("es")}
              >
                {t.toggle.es}
              </button>
              <button
                type="button"
                className={`lang-button${lang === "en" ? " active" : ""}`}
                onClick={() => updateLang("en")}
              >
                {t.toggle.en}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container">
        <section className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="grid gap-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--line)] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
              {t.hero.badge}
            </div>
            <div className="grid gap-3">
              <h1 className="hero-title">{t.hero.title}</h1>
              <p className="hero-copy text-lg">{t.hero.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {t.hero.chips.map((chip) => (
                <span key={chip} className="chip">
                  {chip}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <a className="btn btn-primary" href="#piloto">
                {t.hero.ctaPrimary}
              </a>
              <Link className="btn btn-outline" href={demoHref}>
                {t.hero.ctaSecondary}
              </Link>
            </div>
          </div>
          <div className="hero-card">
            <div className="grid gap-4">
              <div>
                <p className="badge badge-new" style={{ marginBottom: 8 }}>
                  {t.heroCard.badge}
                </p>
                <h2 className="section-title" style={{ marginTop: 0 }}>
                  {t.heroCard.title}
                </h2>
                <p className="hero-copy">{t.heroCard.copy}</p>
              </div>
              <div className="grid gap-3">
                {t.heroCard.pills.map((pill) => (
                  <div key={pill} className="pill">
                    {pill}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-6" id="problema">
          <h2 className="section-title">{t.problem.title}</h2>
          <ul className="grid gap-3 text-[color:var(--muted)] text-base">
            {t.problem.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </section>

        <section className="mt-16 grid gap-6">
          <h2 className="section-title">{t.solution.title}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {t.solution.cards.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[color:var(--line)] bg-white/80 p-5 shadow-[var(--shadow-soft)]"
              >
                <h3 className="font-semibold text-base">{item.title}</h3>
                <p className="text-sm text-[color:var(--muted)]">{item.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-4 rounded-2xl border border-[color:var(--line)] bg-white/70 p-5 shadow-[var(--shadow-soft)]">
          <div className="grid gap-1">
            <h2 className="section-title">{t.forWho.title}</h2>
            <p className="text-sm text-[color:var(--muted)]">{t.forWho.subtitle}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {t.forWho.bullets.map((item) => (
              <div
                key={item}
                className="flex items-start gap-2 rounded-2xl border border-[color:var(--line)] bg-white/80 p-4 shadow-[var(--shadow-soft)]"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--accent)] text-xs font-bold text-white">
                  ✓
                </span>
                <span className="text-sm font-semibold">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6" id="como-funciona">
          <h2 className="section-title">{t.howItWorks.title}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {t.howItWorks.steps.map((step, index) => (
              <div
                key={step}
                className="rounded-2xl border border-[color:var(--line)] bg-white/70 p-5 shadow-[var(--shadow-soft)]"
              >
                <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--accent)] text-white text-base font-bold">
                  {index + 1}
                </div>
                <p className="text-sm text-[color:var(--muted)]">{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6">
          <h2 className="section-title">{t.visuals.title}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <figure className="rounded-2xl border border-[color:var(--line)] bg-white/70 p-4 shadow-[var(--shadow-soft)]">
              <img
                src="/domus-menu.png"
                alt={t.visuals.menuAlt}
                className="h-auto w-full rounded-xl border border-[color:var(--line)] bg-[#f2f2f2] object-cover"
              />
              <figcaption className="mt-3 text-sm text-[color:var(--muted)]">
                {t.visuals.menuCaption}
              </figcaption>
            </figure>
            <figure className="rounded-2xl border border-[color:var(--line)] bg-white/70 p-4 shadow-[var(--shadow-soft)]">
              <img
                src="/domus-cocina.png"
                alt={t.visuals.kitchenAlt}
                className="h-auto w-full rounded-xl border border-[color:var(--line)] bg-[#f2f2f2] object-cover"
              />
              <figcaption className="mt-3 text-sm text-[color:var(--muted)]">
                {t.visuals.kitchenCaption}
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="mt-16 grid gap-6" id="que-incluye">
          <h2 className="section-title">{t.includes.title}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {t.includes.items.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-[color:var(--line)] bg-white/70 p-4 shadow-[var(--shadow-soft)]"
              >
                <span className="text-sm font-semibold">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6" id="precios">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="section-title">{t.pricing.title}</h2>
            <span className="badge badge-new">{t.pricing.badge}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[color:var(--line)] bg-white/80 p-6 shadow-[var(--shadow-soft)]">
              <p className="text-sm font-semibold text-[color:var(--muted)]">
                {t.pricing.featuredLabel}
              </p>
              <h3 className="text-xl font-semibold">{t.pricing.featuredName}</h3>
              <p className="text-sm text-[color:var(--muted)]">{t.pricing.featuredCopy}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <a className="btn btn-primary" href="#piloto">
                  {t.pricing.ctaPrimary}
                </a>
                <Link className="btn btn-outline" href={demoHref}>
                  {t.pricing.ctaSecondary}
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-[color:var(--line)] bg-white/60 p-6 shadow-[var(--shadow-soft)]">
              <p className="text-sm font-semibold text-[color:var(--muted)]">
                {t.pricing.anchorLabel}
              </p>
              <h3 className="text-xl font-semibold">{t.pricing.anchorName}</h3>
              <p className="text-sm text-[color:var(--muted)]">{t.pricing.anchorCopy}</p>
              <div className="mt-4">
                <a
                  className="nav-link inline-flex"
                  href="/domus_hoja_comercial.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.pricing.pdf}
                </a>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-[color:var(--line)] bg-white/60 p-4 text-sm text-[color:var(--muted)]">
            {t.pricing.note}
          </div>
        </section>

        <section className="mt-16 grid gap-6" id="faq">
          <h2 className="section-title">{t.faq.title}</h2>
          <div className="grid gap-3">
            {t.faq.items.map((item) => (
              <details
                key={item.q}
                className="rounded-2xl border border-[color:var(--line)] bg-white/70 p-4 shadow-[var(--shadow-soft)]"
              >
                <summary className="cursor-pointer text-sm font-semibold">
                  {item.q}
                </summary>
                <p className="mt-2 text-sm text-[color:var(--muted)]">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section
          className="mt-16 grid gap-8 rounded-3xl border border-[color:var(--line)] bg-white/80 p-6 shadow-[var(--shadow-soft)] md:grid-cols-[1.1fr_0.9fr] items-start"
          id="piloto"
        >
          <div className="grid gap-4">
            <h2 className="section-title" style={{ marginTop: 0 }}>
              {t.cta.title}
            </h2>
            <p className="text-[color:var(--muted)]">{t.cta.subtitle}</p>
            <div className="grid gap-2 text-sm text-[color:var(--muted)]">
              {t.cta.bullets.map((bullet) => (
                <span key={bullet}>{bullet}</span>
              ))}
            </div>
          </div>
          <LeadForm copy={t.leadForm} />
        </section>
      </main>
    </div>
  );
}
