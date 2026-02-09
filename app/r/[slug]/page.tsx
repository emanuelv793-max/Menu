"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { loadCart, loadTable, saveCart, saveTable, type CartState, type CartLine } from "@/lib/cart";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

type OptionInput =
  | string
  | {
      label?: string | null;
      price?: number | string | null;
    };

type PriceOption = {
  label: string;
  price: number;
};

type Product = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  extras?: OptionInput[] | null;
  excludes?: OptionInput[] | null;
  is_active?: boolean;
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

const normalizeOptions = (raw?: OptionInput[] | null): PriceOption[] => {
  const entries = Array.isArray(raw) ? raw : [];
  const map = new Map<string, PriceOption>();
  entries.forEach((entry) => {
    if (typeof entry === "string") {
      const label = entry.trim();
      if (!label) return;
      map.set(label, { label, price: 0 });
      return;
    }
    if (entry && typeof entry === "object") {
      const label = String(entry.label ?? "").trim();
      if (!label) return;
      const price = Number(entry.price ?? 0);
      const safePrice = Number.isFinite(price) && price >= 0 ? price : 0;
      map.set(label, { label, price: safePrice });
    }
  });
  return Array.from(map.values());
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);

export default function RestaurantPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const searchParams = useSearchParams();
  const restaurantIdParam = (searchParams?.get("restaurantId") ?? "").trim();
  const cartStorageKey = restaurantIdParam || slug;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartState>(() => {
    if (typeof window === "undefined" || !cartStorageKey) {
      return { table: "", lines: [] };
    }
    const current = loadCart(cartStorageKey);
    const table = loadTable(cartStorageKey);
    return { table: table || current.table, lines: current.lines };
  });
  const [modifiers, setModifiers] = useState<
    Map<string, { extras: PriceOption[]; excludes: PriceOption[] }>
  >(new Map());
  const [editingLine, setEditingLine] = useState<CartLineWithMods | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [forceTableModal, setForceTableModal] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [categorySidebarCollapsed, setCategorySidebarCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailQty, setDetailQty] = useState(1);

  useEffect(() => {
    if (!cartStorageKey) return;
    const current = loadCart(cartStorageKey);
    const table = loadTable(cartStorageKey);
    setCart({ table: table || current.table, lines: current.lines });
  }, [cartStorageKey]);

  useEffect(() => {
    const client = supabase;
    if (!client || !slug) return;

    const load = async () => {
      let rest: Restaurant | null = null;
      if (restaurantIdParam) {
        const { data } = await client
          .from("restaurants")
          .select("*")
          .eq("id", restaurantIdParam)
          .single();
        rest = (data as Restaurant | null) ?? null;
      }
      if (!rest) {
        const { data } = await client
          .from("restaurants")
          .select("*")
          .eq("slug", slug)
          .single();
        rest = (data as Restaurant | null) ?? null;
      }
      if (!rest) {
        const { data } = await client
          .from("restaurants")
          .select("*")
          .order("name", { ascending: true })
          .limit(1)
          .single();
        rest = (data as Restaurant | null) ?? null;
      }
      setRestaurant(rest);

      if (!rest) return;

      // Carga productos con extras/excludes en una sola llamada
      const { data: prods } = await client
        .from("products")
        .select("id,name,description,price,image_url,category,extras,excludes,is_active")
        .eq("restaurant_id", rest.id)
        .eq("is_active", true)
        .limit(10)
        .order("category", { ascending: true, nullsFirst: true })
        .order("name");
      const productsData = (prods as Product[]) ?? [];
      setProducts(productsData);

      // Mapea extras/excludes para uso rápido
      const map = new Map<string, { extras: PriceOption[]; excludes: PriceOption[] }>();
      productsData.forEach((p) => {
        map.set(p.id, {
          extras: normalizeOptions(p.extras),
          excludes: normalizeOptions(p.excludes),
        });
      });
      setModifiers(map);
    };

    load();
  }, [slug, restaurantIdParam]);

  useEffect(() => {
    if (!cartStorageKey) return;
    saveCart(cartStorageKey, cart);
    if (cart.table) saveTable(cartStorageKey, cart.table);
  }, [cart, cartStorageKey]);

  // Prefill mesa via query param (table or mesa)
  useEffect(() => {
    if (!searchParams || !cartStorageKey) return;
    const qpTable = searchParams.get("table") || searchParams.get("mesa");
    if (qpTable && qpTable !== cart.table) {
      setCart((prev) => ({ ...prev, table: qpTable }));
    }
  }, [cart.table, searchParams, cartStorageKey]);

  // Detect viewport for responsive behaviors
  useEffect(() => {
    const handler = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsCompactViewport(width < 1120);
    };
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (!isCompactViewport) {
      setCategoryDrawerOpen(false);
    }
  }, [isCompactViewport]);

  useEffect(() => {
    if (isCompactViewport) {
      setCategorySidebarCollapsed(false);
    }
  }, [isCompactViewport]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setCategoryDrawerOpen(false);
      setCartOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const menuById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const productsByCategory = useMemo(() => {
    const groups = new Map<
      string,
      { label: string; items: Product[] }
    >();
    products.forEach((p) => {
      const raw = p.category?.trim();
      const label = raw && raw.length > 0 ? raw : "Otros";
      const norm = label.toLocaleLowerCase("es");
      const existing = groups.get(norm);
      if (existing) {
        existing.items.push(p);
      } else {
        groups.set(norm, { label, items: [p] });
      }
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b, "es"))
      .map(([, value]) => value);
  }, [products]);

  const [categoryFilter, setCategoryFilter] = useState<string>("Todas");

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = productsByCategory.map((group) => ({
      label: group.label,
      items: group.items.filter((p) => {
        const itemCategory = p.category?.trim() || "Otros";
        const matchesCategory = categoryFilter === "Todas" || itemCategory === categoryFilter;
        if (!matchesCategory) return false;
        if (!term) return true;
        return (
          p.name.toLowerCase().includes(term) ||
          (p.description ?? "").toLowerCase().includes(term)
        );
      }),
    }));
    return filtered.filter((g) => g.items.length > 0);
  }, [categoryFilter, productsByCategory, search]);

  const categoryOptions = useMemo(
    () => ["Todas", ...productsByCategory.map((group) => group.label)],
    [productsByCategory]
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set("Todas", products.length);
    productsByCategory.forEach((group) => {
      counts.set(group.label, group.items.length);
    });
    return counts;
  }, [products, productsByCategory]);

  const visibleProductsCount = useMemo(
    () => filteredGroups.reduce((sum, group) => sum + group.items.length, 0),
    [filteredGroups]
  );

  const showDesktopCategorySidebar = !isCompactViewport;
  const useCartDrawer = isMobile || isCompactViewport;

  const selectCategory = (category: string) => {
    setCategoryFilter(category);
    setCategoryDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!useCartDrawer) {
      setCartOpen(false);
    }
  }, [useCartDrawer]);

  useEffect(() => {
    const shouldLockBody = categoryDrawerOpen || (useCartDrawer && cartOpen);
    if (!shouldLockBody) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [cartOpen, categoryDrawerOpen, useCartDrawer]);

  const cartLines = useMemo<CartDisplayLine[]>(() => {
    return cart.lines
      .map((line) => {
        const product = menuById.get(line.productId);
        if (!product) return null;
        const optionSet = modifiers.get(line.productId);
        const selectedExtras = line.selectedExtras ?? [];
        const selectedExcludes = line.selectedExcludes ?? [];
        const computedMods: CartModifier[] = [
          ...selectedExtras.map((label) => {
            const option = (optionSet?.extras ?? []).find((o) => o.label === label);
            return {
              id: undefined,
              label,
              type: "extra" as const,
              price: option?.price ?? 0,
            };
          }),
          ...selectedExcludes.map((label) => {
            const option = (optionSet?.excludes ?? []).find((o) => o.label === label);
            return {
              id: undefined,
              label,
              type: "remove" as const,
              price: option?.price ?? 0,
            };
          }),
        ];
        const modifiersTotal = computedMods.reduce(
          (sum, mod) => sum + (Number.isFinite(mod.price) ? mod.price : 0),
          0
        );
        const unitPrice = Number(product.price) + modifiersTotal;
        return {
          id: product.id,
          name: product.name,
          price: unitPrice,
          lineId: line.id,
          qty: line.qty,
          note: line.note ?? "",
          modifiers: computedMods,
          selectedExtras,
          selectedExcludes,
          lineTotal: unitPrice * line.qty,
        };
      })
      .filter(Boolean) as CartDisplayLine[];
  }, [cart.lines, menuById, modifiers]);

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
            modifiers: (item.modifiers ?? []).map((modifier) => ({
              label: modifier.label,
              type: modifier.type,
              price: modifier.price,
            })),
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

  const cartContent = (
    confirming ? (
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
              {line.qty} × {line.name} ({formatCurrency(line.lineTotal)})
              {line.note ? ` · Nota: ${line.note}` : ""}
              {(line.modifiers?.length ?? 0) > 0
                ? ` · ${(line.modifiers ?? [])
                    .map((m) => {
                      const priceTag = m.price ? ` (${formatCurrency(m.price)})` : "";
                      return `${m.type === "extra" ? "+" : "-"} ${m.label}${priceTag}`;
                    })
                    .join(" · ")}`
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
          <span className="menu-price">{formatCurrency(total)}</span>
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
                  {item.qty} × {formatCurrency(item.price)}
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
                {(item.modifiers?.length ?? 0) > 0 ? (
                  <div className="status-text" style={{ marginTop: 6 }}>
                    {(item.modifiers ?? [])
                      .map((m) => {
                        const priceTag = m.price ? ` (${formatCurrency(m.price)})` : "";
                        return `${m.type === "extra" ? "+" : "-"} ${m.label}${priceTag}`;
                      })
                      .join(" · ")}
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
          <div className="menu-price">{formatCurrency(total)}</div>
        </div>

        <button className="btn btn-primary" onClick={sendOrder} disabled={loading}>
          {loading ? "Enviando..." : "Enviar pedido"}
        </button>
        {status ? <p className="status-text">{status}</p> : null}
      </>
    )
  );
  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark">{restaurant?.name ?? "DOMUS"}</div>
          </div>
          <div className="topbar-nav" style={{ width: "100%", justifyContent: "flex-end", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%", maxWidth: 520 }}>
              <input
                className="input"
                placeholder="Buscar producto"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", padding: "10px 12px" }}
              />
            </div>
            <Link className="nav-link" href="/admin">
              Cocina
            </Link>
          </div>
        </div>
      </header>

      <main className="container">
        <div className="marketplace-toolbar">
          <div className="marketplace-toolbar-actions">
            <div className="pill" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontWeight: 700 }}>Mesa</span>
              <input
                className="input"
                style={{ padding: "8px 12px", width: 100 }}
                placeholder="Ej. 12"
                value={cart.table}
                onChange={(e) => setCart((prev) => ({ ...prev, table: e.target.value }))}
              />
            </div>
            {!showDesktopCategorySidebar && categoryOptions.length > 0 ? (
              <button
                className="btn btn-outline btn-small"
                onClick={() => setCategoryDrawerOpen(true)}
                aria-label="Abrir categorías"
                aria-expanded={categoryDrawerOpen}
              >
                ☰ Categorías
              </button>
            ) : null}
            {useCartDrawer ? (
              <button
                className="btn btn-primary btn-small"
                onClick={() => setCartOpen(true)}
                aria-label="Abrir carrito"
                aria-expanded={cartOpen}
              >
                Carrito ({cartLines.length}) · {formatCurrency(total)}
              </button>
            ) : null}
          </div>
          <div className="pill marketplace-toolbar-meta">
            {categoryFilter === "Todas" ? "Todo el menú" : categoryFilter} · {visibleProductsCount} productos
          </div>
        </div>

        <section className={`marketplace-shell ${showDesktopCategorySidebar ? "has-sidebar" : "no-sidebar"} ${isMobile ? "mobile" : "desktop"}`}>
          {showDesktopCategorySidebar && categoryOptions.length > 0 ? (
            <aside className={`category-sidebar ${categorySidebarCollapsed ? "collapsed" : ""}`}>
              <div className="category-sidebar-head">
                <h3 className="category-sidebar-title">Categorías</h3>
                <button
                  className="category-collapse-btn"
                  onClick={() => setCategorySidebarCollapsed((value) => !value)}
                  aria-label={categorySidebarCollapsed ? "Expandir categorías" : "Colapsar categorías"}
                >
                  {categorySidebarCollapsed ? "»" : "«"}
                </button>
              </div>
              <nav className="category-sidebar-list" aria-label="Categorías del menú">
                {categoryOptions.map((category) => {
                  const active = categoryFilter === category;
                  const count = categoryCounts.get(category) ?? 0;
                  const short = category === "Todas" ? "ALL" : category.slice(0, 2).toUpperCase();
                  return (
                    <button
                      key={category}
                      type="button"
                      title={category}
                      className={`category-nav-item ${active ? "active" : ""}`}
                      aria-pressed={active}
                      onClick={() => selectCategory(category)}
                    >
                      <span className="category-nav-short">{short}</span>
                      <span className="category-nav-label">{category}</span>
                      <span className="category-nav-count">{count}</span>
                    </button>
                  );
                })}
              </nav>
            </aside>
          ) : null}

          <div className="marketplace-main">
            {filteredGroups.length === 0 ? (
              <div className="hero-card" style={{ padding: 18 }}>
                <h3 className="section-title" style={{ marginBottom: 8 }}>Sin resultados</h3>
                <p className="status-text" style={{ margin: 0 }}>
                  No encontramos productos con los filtros actuales.
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <button
                    className="btn btn-outline btn-small"
                    onClick={() => {
                      setSearch("");
                      setCategoryFilter("Todas");
                    }}
                  >
                    Limpiar filtros
                  </button>
                </div>
              </div>
            ) : (
              <div className="marketplace-groups">
                {filteredGroups.map((group) => (
                  <section key={group.label} className="marketplace-group">
                    <div className="marketplace-group-head">
                      <h3>{group.label}</h3>
                      <span>{group.items.length}</span>
                    </div>
                    <div className="menu-grid">
                      {group.items.map((item) => (
                        <button
                          key={item.id}
                          className="menu-card"
                          onClick={() => {
                            setDetailId(item.id);
                            setDetailQty(1);
                          }}
                          style={{ textAlign: "left" }}
                        >
                          <div className="menu-thumb" style={{ background: "#f8f6ff", minHeight: 150 }}>
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
                                {item.category || "Producto"}
                              </div>
                            )}
                          </div>
                          <div className="menu-body">
                            <div style={{ display: "grid", gap: 6 }}>
                              <div className="status-text" style={{ textTransform: "uppercase", letterSpacing: "0.07em" }}>
                                {item.category?.trim() || "Otros"}
                              </div>
                              <div style={{ fontWeight: 700, fontSize: 15, lineHeight: "1.2", minHeight: 38, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {item.name}
                              </div>
                              <div className="menu-price">
                                {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(item.price)}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>

          {!useCartDrawer ? (
            <aside className="cart">
              {cartContent}
            </aside>
          ) : null}
        </section>
      </main>

      {!showDesktopCategorySidebar && categoryOptions.length > 0 ? (
        <>
          {categoryDrawerOpen ? (
            <div className="category-drawer-overlay" onClick={() => setCategoryDrawerOpen(false)}>
              <aside className="category-drawer" onClick={(e) => e.stopPropagation()}>
                <div className="category-drawer-head">
                  <h3>Categorías</h3>
                  <button className="category-drawer-close" onClick={() => setCategoryDrawerOpen(false)}>
                    ×
                  </button>
                </div>
                <div className="category-drawer-list">
                  {categoryOptions.map((category) => {
                    const active = categoryFilter === category;
                    const count = categoryCounts.get(category) ?? 0;
                    return (
                      <button
                        key={category}
                        type="button"
                        className={`category-nav-item drawer ${active ? "active" : ""}`}
                        aria-pressed={active}
                        onClick={() => selectCategory(category)}
                      >
                        <span className="category-nav-label">{category}</span>
                        <span className="category-nav-count">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </aside>
            </div>
          ) : null}
        </>
      ) : null}

      {useCartDrawer ? (
        <>
          {isMobile ? (
            <button className="cart-fab" onClick={() => setCartOpen(true)}>
              Carrito ({cartLines.length}) · {formatCurrency(total)}
            </button>
          ) : null}
          {cartOpen ? (
            <div className="cart-drawer-overlay" onClick={() => setCartOpen(false)}>
              <div
                className="cart-drawer"
                onClick={(e) => e.stopPropagation()}
                style={{ position: "relative" }}
              >
                <button className="cart-drawer-close" onClick={() => setCartOpen(false)}>
                  ×
                </button>
                {cartContent}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

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
                  {(modifiers.get(editingLine.productId)?.excludes ?? []).map((option) => {
                    const label = option.label;
                    const price = option.price ?? 0;
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
                              : { id: undefined, label, type: "remove", price };
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
                        - {label}{price ? ` (${formatCurrency(price)})` : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Extra</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(modifiers.get(editingLine.productId)?.extras ?? []).map((option) => {
                    const label = option.label;
                    const price = option.price ?? 0;
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
                              : { id: undefined, label, type: "extra", price };
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
                        + {label}{price ? ` (${formatCurrency(price)})` : ""}
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

      {detailId ? (
        <div className="modal-backdrop" onClick={() => setDetailId(null)}>
          <div className="modal" style={{ maxWidth: 420, position: "relative" }} onClick={(e) => e.stopPropagation()}>
            <button className="cart-drawer-close" onClick={() => setDetailId(null)}>
              ×
            </button>
            {(() => {
              const p = menuById.get(detailId);
              if (!p) return null;
              return (
                <div style={{ display: "grid", gap: 12 }}>
                  <div className="menu-thumb" style={{ height: 220 }}>
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name} />
                    ) : (
                      <div style={{ display: "grid", placeItems: "center", width: "100%", height: "100%", background: "#f5f2ff" }}>{p.category || "Producto"}</div>
                    )}
                  </div>
                  <div>
                    <h3 style={{ margin: 0 }}>{p.name}</h3>
                    <p className="status-text" style={{ marginTop: 4 }}>{p.description}</p>
                    <div className="menu-price" style={{ marginTop: 6 }}>
                      {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(p.price)}
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="cart-controls">
                      <button className="btn btn-outline btn-small" onClick={() => setDetailQty((q) => Math.max(1, q - 1))}>-</button>
                      <span>{detailQty}</span>
                      <button className="btn btn-outline btn-small" onClick={() => setDetailQty((q) => q + 1)}>+</button>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        for (let i = 0; i < detailQty; i += 1) addLine(p.id);
                        setDetailId(null);
                        setDetailQty(1);
                        setCartOpen(true);
                      }}
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : null}
    </div>
  );
}
