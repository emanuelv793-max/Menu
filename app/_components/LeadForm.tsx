"use client";

import { type FormEvent, useMemo, useState } from "react";

type LeadFormState = {
  name: string;
  restaurant: string;
  city: string;
  whatsapp: string;
  tables: string;
};

type LeadFormCopy = {
  labels: {
    name: string;
    restaurant: string;
    city: string;
    whatsapp: string;
    tables: string;
  };
  placeholders: {
    name: string;
    restaurant: string;
    city: string;
    whatsapp: string;
    tables: string;
  };
  submit: string;
  helper: string;
  message: (state: LeadFormState) => string;
};

type LeadFormProps = {
  copy?: Partial<LeadFormCopy>;
};

const FALLBACK_WHATSAPP = "34638346755";

const defaultCopy: LeadFormCopy = {
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
  message: (state) =>
    `Hola, soy ${state.name}. Restaurante: ${state.restaurant} (Ciudad: ${state.city}). Mesas: ${state.tables}. Quiero activar el piloto gratis 15 días de Domus.`,
};

export default function LeadForm({ copy }: LeadFormProps) {
  const [state, setState] = useState<LeadFormState>({
    name: "",
    restaurant: "",
    city: "",
    whatsapp: "",
    tables: "",
  });

  const resolvedCopy: LeadFormCopy = {
    labels: { ...defaultCopy.labels, ...(copy?.labels ?? {}) },
    placeholders: { ...defaultCopy.placeholders, ...(copy?.placeholders ?? {}) },
    submit: copy?.submit ?? defaultCopy.submit,
    helper: copy?.helper ?? defaultCopy.helper,
    message: copy?.message ?? defaultCopy.message,
  };

  const whatsappNumber = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? FALLBACK_WHATSAPP;
    const digits = raw.replace(/\D/g, "");
    return digits || FALLBACK_WHATSAPP;
  }, []);

  const update = (field: keyof LeadFormState, value: string) => {
    setState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = resolvedCopy.message(state);
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <label htmlFor="lead-name" className="text-sm font-semibold">
          {resolvedCopy.labels.name}
        </label>
        <input
          id="lead-name"
          className="input"
          required
          value={state.name}
          onChange={(event) => update("name", event.target.value)}
          placeholder={resolvedCopy.placeholders.name}
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="lead-restaurant" className="text-sm font-semibold">
          {resolvedCopy.labels.restaurant}
        </label>
        <input
          id="lead-restaurant"
          className="input"
          required
          value={state.restaurant}
          onChange={(event) => update("restaurant", event.target.value)}
          placeholder={resolvedCopy.placeholders.restaurant}
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="lead-city" className="text-sm font-semibold">
          {resolvedCopy.labels.city}
        </label>
        <input
          id="lead-city"
          className="input"
          required
          value={state.city}
          onChange={(event) => update("city", event.target.value)}
          placeholder={resolvedCopy.placeholders.city}
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="lead-whatsapp" className="text-sm font-semibold">
          {resolvedCopy.labels.whatsapp}
        </label>
        <input
          id="lead-whatsapp"
          className="input"
          required
          value={state.whatsapp}
          onChange={(event) => update("whatsapp", event.target.value)}
          placeholder={resolvedCopy.placeholders.whatsapp}
          inputMode="tel"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="lead-tables" className="text-sm font-semibold">
          {resolvedCopy.labels.tables}
        </label>
        <input
          id="lead-tables"
          className="input"
          required
          value={state.tables}
          onChange={(event) => update("tables", event.target.value)}
          placeholder={resolvedCopy.placeholders.tables}
          inputMode="numeric"
        />
      </div>

      <button type="submit" className="btn btn-primary w-full">
        {resolvedCopy.submit}
      </button>
      <p className="text-xs text-[color:var(--muted)]">{resolvedCopy.helper}</p>
    </form>
  );
}
