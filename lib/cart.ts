"use client";

const storage = (key: string, slug: string) => `${key}-${slug}`;

export type CartLine = {
  id: string;
  productId: string;
  qty: number;
  note?: string;
  selectedExtras?: string[];
  selectedExcludes?: string[];
};

export type CartState = {
  table: string;
  lines: CartLine[];
};

export const loadCart = (slug: string): CartState => {
  if (typeof window === "undefined") return { table: "", lines: [] };
  const raw = window.localStorage.getItem(storage("cart", slug));
  if (!raw) return { table: "", lines: [] };
  try {
    const parsed = JSON.parse(raw) as CartState;
    const linesWithId = (parsed.lines || []).map((line, idx) => ({
      id: line.id ?? `${line.productId}-${idx}-${Date.now()}`,
      productId: line.productId,
      qty: line.qty,
      note: line.note,
      selectedExtras: line.selectedExtras ?? [],
      selectedExcludes: line.selectedExcludes ?? [],
    }));
    return { table: parsed.table || "", lines: linesWithId };
  } catch {
    return { table: "", lines: [] };
  }
};

export const saveCart = (slug: string, value: CartState) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storage("cart", slug), JSON.stringify(value));
};

export const loadTable = (slug: string): string => {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(storage("table", slug)) ?? "";
};

export const saveTable = (slug: string, table: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storage("table", slug), table);
};
