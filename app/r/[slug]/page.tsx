"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { loadCart, loadTable, saveCart, saveTable, type CartState, type CartLine } from "@/lib/cart";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

type Product = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  extras?: string[] | null;
  excludes?: string[] | null;
};

type CartModifier = {
  id?: string;
  label: string;
  type: "remove" | "extra";
  price: number;
};

type CartLineWithMods = CartLine & { modifiers?: CartModifier[] };
type CartDisplayLine = {
  lineId: string;
  id: string;
  name: string;
  price: number;
  qty: number;
  note?: string;
  selectedExtras: string[];
  selectedExcludes: string[];
  modifiers?: CartModifier[];
  lineTotal: number;
};

export default function RestaurantPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartState>(() => {
    if (typeof window === "undefined" || !slug) {
      return { table: "", lines: [] };
    }
    const current = loadCart(slug);
    const table = loadTable(slug);
    return { table: table || current.table, lines: current.lines };
  });
  const [modifiers, setModifiers] = useState<Map<string, { extras: string[]; excludes: string[] }>>(new Map());
  const [editingLine, setEditingLine] = useState<CartLineWithMods | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [forceTableModal, setForceTableModal] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const client = supabase;
    if (!client || !slug) return;

    const load = async () => {
      const { data: rest } = await client
        .from("restaurants")
        .select("*")
        .eq("slug", slug)
        .single();
      setRestaurant(rest as Restaurant | null);

      if (!rest) return;

      // Carga productos con extras/excludes en una sola llamada
      const { data: prods } = await client
        .from("products")
        .select("id,name,description,price,image_url,category,extras,excludes")
        .eq("restaurant_id", rest.id)
        .order("name");
      const productsData = (prods as Product[]) ?? [];
      setProducts(productsData);

      // Mapea extras/excludes para uso rápido
      const map = new Map<string, { extras: string[]; excludes: string[] }>();
      productsData.forEach((p) => {
        map.set(p.id, {
          extras: (p.extras ?? []).map((s) => s ?? "").filter(Boolean),
          excludes: (p.excludes ?? []).map((s) => s ?? "").filter(Boolean),
        });
      });
      setModifiers(map);
    };

    load();
  }, [slug]);

  useEffect(() => {
    saveCart(slug, cart);
    if (cart.table) saveTable(slug, cart.table);
  }, [cart, slug]);

  const menuById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const productsByCategory = useMemo(() => {
    const groups = new Map<string, Product[]>();
    products.forEach((p) => {
      const key = p.category?.trim() || "Otros";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    });
    return Array.from(groups.entries()).sort(([a], [b]) =>
      a.localeCompare(b, "es")
    );
  }, [products]);

  const cartLines = useMemo<CartDisplayLine[]>(() => {
    return cart.lines
      .map((line) => {
        const product = menuById.get(line.productId);
        if (!product) return null;
        const mods = (line as CartLineWithMods).modifiers ?? [];
        return {
          id: product.id,
          name: product.name,
          price: Number(product.price),
          lineId: line.id,
          qty: line.qty,
          note: line.note ?? "",
          modifiers: mods,
          selectedExtras: line.selectedExtras ?? [],
          selectedExcludes: line.selectedExcludes ?? [],
          lineTotal: Number(product.price) * line.qty,
        };
      })
      .filter(Boolean) as CartDisplayLine[];
  }, [cart.lines, menuById]);

  const total = useMemo(
    () => cartLines.reduce((acc, item) => acc + item.lineTotal, 0),
    [cartLines]
  );

  const ensureTable = () => {
    if (!cart.table.trim()) {
      setForceTableModal(true);
      return false;
    }
    return true;
  };

  const addLine = (productId: string) => {
    const id = `${productId}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    setCart((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          id,
          productId,
          qty: 1,
          note: "",
          selectedExtras: [],
          selectedExcludes: [],
        },
      ],
    }));
  };

  const updateQty = (lineId: string, delta: number) => {
    setCart((prev) => ({
      ...prev,
      lines: prev.lines
        .map((l) =>
          l.id === lineId ? { ...l, qty: l.qty + delta } : l
        )
        .filter((l) => l.qty > 0),
    }));
  };

  const removeLine = (lineId: string) => {
    setCart((prev) => ({
      ...prev,
      lines: prev.lines.filter((l) => l.id !== lineId),
    }));
  };

  const sendOrder = () => {
    if (!ensureTable()) return;
    if (cartLines.length === 0) {
      setStatus("Agrega productos antes de enviar.");
      return;
    }
    setConfirming(true);
  };

  const confirmSend = async () => {
    if (!restaurant) {
      setStatus("No se encontró el restaurante.");
      setConfirming(false);
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantSlug: restaurant.slug,
          table: cart.table.trim(),
          items: cartLines.map((item) => ({
            productId: item.id,
            qty: item.qty,
            note: item.note,
            modifiers: [
              ...(item.selectedExtras ?? []).map((label) => ({
                label,
                type: "extra" as const,
                price: 0,
              })),
              ...(item.selectedExcludes ?? []).map((label) => ({
                label,
                type: "remove" as const,
                price: 0,
              })),
            ],
          })),
        }),
      });

      if (!response.ok) {
        const { message } = await response.json();
        throw new Error(message || "No se pudo enviar el pedido.");
      }

      setCart({ table: cart.table, lines: [] });
      setStatus("Pedido enviado a cocina.");
    } catch (err) {
      setStatus((err as Error).message || "No se pudo enviar el pedido.");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark">Menu Lungo</div>
            <div className="brand-sub">{restaurant?.name ?? "Restaurante"}</div>
          </div>
          <Link className="nav-link" href="/admin">
            Cocina
          </Link>
        </div>
      </header>

      <main className="container">
        <section className="layout">
          <div>
            <div className="table-card">
              <div>
                <p className="badge badge-new">Mesa</p>
                <h3>Ingresa tu número de mesa</h3>
              </div>
              <div className="table-input" style={{ marginTop: 12 }}>
                <input
                  className="input"
                  placeholder="Ej. 12"
                  value={cart.table}
                  onChange={(e) =>
                    setCart((prev) => ({ ...prev, table: e.target.value }))
                  }
                />
              </div>
            </div>

            <h3 className="section-title" style={{ marginTop: 32 }}>
              Productos
            </h3>
            {productsByCategory.map(([category, items]) => (
              <div key={category} style={{ marginBottom: 18 }}>
                <h4 style={{ margin: "6px 0 10px" }}>{category}</h4>
                <div className="menu-grid">
                  {items.map((item) => (
                    <div key={item.id} className="menu-card">
                      <div className="menu-thumb" style={{ background: "linear-gradient(135deg, #f9f3ff, #f8eee5)" }}>
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image_url} alt={item.name} />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "grid",
                              placeItems: "center",
                              color: "#6b6175",
                              fontWeight: 600,
                            }}
                          >
                            {item.category || "Sin imagen"}
                          </div>
                        )}
                      </div>
                      <div className="menu-body">
                        <div className="menu-top">
                          <h4>{item.name}</h4>
                          <span className="menu-price">
                            {new Intl.NumberFormat("es-ES", {
                              style: "currency",
                              currency: "EUR",
                            }).format(item.price)}
                          </span>
                        </div>
                        <p className="menu-desc">{item.description}</p>
                        {(item.extras?.length ?? 0) > 0 ? (
                          <p className="status-text" style={{ marginTop: 4 }}>
                            Extras: {(item.extras ?? []).join(", ")}
                          </p>
                        ) : null}
                        {(item.excludes?.length ?? 0) > 0 ? (
                          <p className="status-text" style={{ marginTop: 2 }}>
                            Sin: {(item.excludes ?? []).join(", ")}
                          </p>
                        ) : null}
                        <button
                          className="btn btn-outline btn-small"
                          onClick={() => addLine(item.id)}
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <aside className="cart">
            {confirming ? (
              <div
                style={{
                  background: "#e9f2ff",
                  border: "1px solid rgba(42,33,22,0.18)",
                  borderRadius: 18,
                  padding: 14,
                  boxShadow: "var(--shadow-soft)",
                }}
              >
                <h3 className="section-title" style={{ marginBottom: 8 }}>
                  Confirmar envío
                </h3>
                <p className="status-text" style={{ margin: "4px 0 12px" }}>
                  Mesa {cart.table || "—"}
                </p>
                <div className="order-items" style={{ marginBottom: 12 }}>
                  {cartLines.map((line) => (
                    <div key={line.lineId}>
                      {line.qty} × {line.name} ({line.lineTotal.toFixed(2)} €)
                      {line.note ? ` · Nota: ${line.note}` : ""}
                      {(line.selectedExtras.length + line.selectedExcludes.length) > 0
                        ? ` · ${[
                            ...line.selectedExtras.map((m) => `+ ${m}`),
                            ...line.selectedExcludes.map((m) => `- ${m}`),
                          ].join(" · ")}`
                        : ""}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <strong>Total</strong>
                  <span className="menu-price">{total.toFixed(2)} €</span>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    className="btn btn-outline btn-small"
                    onClick={() => setConfirming(false)}
                    disabled={loading}
                  >
                    Volver
                  </button>
                  <button
                    className="btn btn-primary btn-small"
                    onClick={confirmSend}
                    disabled={loading}
                  >
                    {loading ? "Enviando..." : "Confirmar envío"}
                  </button>
                </div>
                {status ? (
                  <p className="status-text" style={{ marginTop: 8 }}>
                    {status}
                  </p>
                ) : null}
              </div>
            ) : (
              <>
                <h3 className="section-title">Tu carrito</h3>
                {cartLines.length === 0 ? (
                  <p className="status-text">Aún no hay productos.</p>
                ) : (
                  cartLines.map((item) => (
                    <div key={item.lineId} className="cart-item">
                      <div>
                        <strong>{item.name}</strong>
                        <div className="status-text">
                          {item.qty} × {Number(item.price).toFixed(2)} €
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                          <button
                            className="btn btn-outline btn-small"
                            onClick={() => {
                              const original = cart.lines.find((l) => l.id === item.lineId);
                              if (!original) return;
                              setEditingLine({
                                ...(original as CartLineWithMods),
                                modifiers: item.modifiers ?? [],
                                selectedExtras: original.selectedExtras ?? [],
                                selectedExcludes: original.selectedExcludes ?? [],
                                note: original.note ?? "",
                              });
                            }}
                          >
                            Modificar / Nota
                          </button>
                        </div>
                        {(item.selectedExtras?.length || 0) + (item.selectedExcludes?.length || 0) > 0 ? (
                          <div className="status-text" style={{ marginTop: 6 }}>
                            {[...(item.selectedExtras ?? []).map((e) => `+ ${e}`), ...(item.selectedExcludes ?? []).map((e) => `- ${e}`)].join(" · ")}
                          </div>
                        ) : null}
                        {item.note ? (
                          <div className="status-text" style={{ marginTop: 2 }}>
                            Nota: {item.note}
                          </div>
                        ) : null}
                      </div>
                      <div className="cart-controls">
                        <button
                          className="btn btn-outline btn-small"
                          onClick={() => updateQty(item.lineId, -1)}
                        >
                          -
                        </button>
                        <span>{item.qty}</span>
                        <button
                          className="btn btn-outline btn-small"
                          onClick={() => updateQty(item.lineId, 1)}
                        >
                          +
                        </button>
                        <button
                          className="btn btn-outline btn-small"
                          onClick={() => removeLine(item.lineId)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}

                <div className="cart-item">
                  <div>
                    <strong>Total</strong>
                  </div>
                  <div className="menu-price">{total.toFixed(2)} €</div>
                </div>

                <button className="btn btn-primary" onClick={sendOrder} disabled={loading}>
                  {loading ? "Enviando..." : "Enviar pedido"}
                </button>
                {status ? <p className="status-text">{status}</p> : null}
              </>
            )}
          </aside>
        </section>
      </main>

      {forceTableModal ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Necesitamos tu mesa</h3>
            <p>Ingresa el número de mesa antes de agregar productos.</p>
            <button className="btn btn-primary" onClick={() => setForceTableModal(false)}>
              Entendido
            </button>
          </div>
        </div>
      ) : null}

      {editingLine ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Modificaciones</h3>
            <p style={{ marginTop: 0, color: "var(--muted)" }}>
              Selecciona lo que se puede quitar o agregar.
            </p>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Quitar</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(modifiers.get(editingLine.productId)?.excludes ?? []).map((label) => {
                    const selected = (editingLine.selectedExcludes ?? []).includes(label);
                    return (
                      <button
                        key={label}
                        className="btn btn-outline btn-small"
                        style={{ background: selected ? "var(--ink)" : "#fff", color: selected ? "#fff" : "var(--ink)" }}
                        onClick={() => {
                          setEditingLine((prev) => {
                            if (!prev) return prev;
                            const nextSelected = selected
                              ? (prev.selectedExcludes ?? []).filter((l) => l !== label)
                              : [...(prev.selectedExcludes ?? []), label];
                            const added: CartModifier | null = selected
                              ? null
                              : { id: undefined, label, type: "remove", price: 0 };
                            const nextMods = [
                              ...(prev.modifiers ?? []).filter(
                                (m) => !(m.type === "remove" && m.label === label)
                              ),
                              ...(added ? [added] : []),
                            ];
                            return { ...prev, selectedExcludes: nextSelected, modifiers: nextMods };
                          });
                        }}
                      >
                        - {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Extra</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(modifiers.get(editingLine.productId)?.extras ?? []).map((label) => {
                    const selected = (editingLine.selectedExtras ?? []).includes(label);
                    return (
                      <button
                        key={label}
                        className="btn btn-outline btn-small"
                        style={{ background: selected ? "var(--accent)" : "#fff", color: selected ? "#fff" : "var(--ink)" }}
                        onClick={() => {
                          setEditingLine((prev) => {
                            if (!prev) return prev;
                            const nextSelected = selected
                              ? (prev.selectedExtras ?? []).filter((l) => l !== label)
                              : [...(prev.selectedExtras ?? []), label];
                            const added: CartModifier | null = selected
                              ? null
                              : { id: undefined, label, type: "extra", price: 0 };
                            const nextMods = [
                              ...(prev.modifiers ?? []).filter(
                                (m) => !(m.type === "extra" && m.label === label)
                              ),
                              ...(added ? [added] : []),
                            ];
                            return { ...prev, selectedExtras: nextSelected, modifiers: nextMods };
                          });
                        }}
                      >
                        + {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Nota</div>
                <textarea
                  className="input"
                  style={{ width: "100%", minHeight: 70 }}
                  value={editingLine.note ?? ""}
                  onChange={(e) =>
                    setEditingLine((prev) => (prev ? { ...prev, note: e.target.value } : prev))
                  }
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button className="btn btn-outline" onClick={() => setEditingLine(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setCart((prev) => ({
                    ...prev,
                    lines: prev.lines.map((l) =>
                      l.id === editingLine.id
                        ? {
                            ...l,
                            note: editingLine.note ?? "",
                            selectedExtras: editingLine.selectedExtras ?? [],
                            selectedExcludes: editingLine.selectedExcludes ?? [],
                          }
                        : l
                    ),
                  }));
                  setEditingLine(null);
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
