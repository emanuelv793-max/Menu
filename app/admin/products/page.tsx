"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../_components/AdminShell";
import { supabase } from "@/lib/supabaseClient";

type Restaurant = {
  id: string;
  name: string;
  slug: string;
};

type Product = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  created_at: string;
  extras?: string[] | null;
  excludes?: string[] | null;
};


type EditorState = {
  id?: string;
  restaurant_id: string;
  name: string;
  description: string;
  price: string;
  image_url: string;
  category: string;
  extras: string[];
  excludes: string[];
};

const emptyEditor = (restaurantId: string): EditorState => ({
  restaurant_id: restaurantId,
  name: "",
  description: "",
  price: "0.00",
  image_url: "",
  category: "",
  extras: [],
  excludes: [],
});

export default function ProductsAdminPage() {
  const [token, setToken] = useState<string>("");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null
  );
  const [editor, setEditor] = useState<EditorState>(emptyEditor(""));
  const [newExtra, setNewExtra] = useState({ label: "" });
  const [newRemove, setNewRemove] = useState({ label: "" });

  const fetchAdmin = async (input: RequestInfo, init?: RequestInit) => {
    if (!token) throw new Error("Sesión inválida. Vuelve a iniciar sesión.");
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token ?? "";
      if (mounted) setToken(accessToken);
    };
    load();
    const { data: listener } = supabase
      ? supabase.auth.onAuthStateChange((_event, session) => {
          setToken(session?.access_token ?? "");
        })
      : { data: undefined };
    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadRestaurants = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("restaurants")
        .select("id,name,slug")
        .order("name", { ascending: true });
      if (error) {
        setToast({ kind: "error", text: "No se pudieron cargar restaurantes." });
        return;
      }
      const list = (data ?? []) as Restaurant[];
      setRestaurants(list);
      if (!restaurantId && list.length > 0) {
        setRestaurantId(list[0].id);
      }
    };
    loadRestaurants().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincroniza el restaurante del editor cuando cambia la selección y no se está editando uno existente
  useEffect(() => {
    if (!editor.id) {
      setEditor((prev) => ({ ...prev, restaurant_id: restaurantId || "" }));
    }
  }, [restaurantId, editor.id]);

  const loadProducts = async () => {
    if (!restaurantId) return;
    setLoading(true);
    setToast(null);
    try {
      const params = new URLSearchParams();
      params.set("restaurantId", restaurantId);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetchAdmin(`/api/admin/products?${params.toString()}`);
      const payload = (await res.json()) as { message?: string; products?: Product[] };
      if (!res.ok) throw new Error(payload.message || "No se pudieron cargar productos.");
      setProducts((payload.products ?? []) as Product[]);
    } catch (err) {
      setToast({ kind: "error", text: (err as Error).message || "Error cargando productos." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || !restaurantId) return;
    loadProducts().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, restaurantId]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [products]);


  const openEdit = (p: Product) => {
    setEditor({
      id: p.id,
      restaurant_id: p.restaurant_id,
      name: p.name,
      description: p.description ?? "",
      price: Number(p.price).toFixed(2),
      image_url: p.image_url ?? "",
      category: p.category ?? "",
      extras: p.extras ?? [],
      excludes: p.excludes ?? [],
    });
  };

  const save = async () => {
    setLoading(true);
    setToast(null);
    try {
      const priceNumber = Number(String(editor.price).replace(",", "."));
      const payload = {
        id: editor.id,
        restaurant_id: editor.restaurant_id,
        name: editor.name,
        description: editor.description || null,
        price: priceNumber,
        image_url: editor.image_url || null,
        category: editor.category || null,
        extras: editor.extras,
        excludes: editor.excludes,
      };

      const res = await fetchAdmin("/api/admin/products", {
        method: editor.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "No se pudo guardar el producto.");
      setToast({ kind: "ok", text: editor.id ? "Producto actualizado." : "Producto creado." });
      await loadProducts();
    } catch (err) {
      setToast({ kind: "error", text: (err as Error).message || "No se pudo guardar." });
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este producto?")) return;
    setLoading(true);
    setToast(null);
    try {
      const res = await fetchAdmin(`/api/admin/products?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(data.message || "No se pudo eliminar.");
      setToast({ kind: "ok", text: "Producto eliminado." });
      await loadProducts();
    } catch (err) {
      setToast({ kind: "error", text: (err as Error).message || "No se pudo eliminar." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminShell>
      <main className="container">
        <section className="hero" style={{ alignItems: "start" }}>
          <div className="hero-card">
            <h1 className="hero-title">Productos</h1>
            <p className="hero-copy">
              Mantén el menú actualizado: crea, edita y elimina productos.
            </p>
              <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <label style={{ fontSize: 13, color: "#6f5b4c" }}>Restaurante</label>
              <select
                className="input"
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <label style={{ fontSize: 13, color: "#6f5b4c" }}>Buscar</label>
              <input
                className="input"
                placeholder="Carpaccio, postre, bebida..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadProducts().catch(() => undefined);
                }}
              />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="btn btn-outline btn-small"
                  onClick={() => loadProducts().catch(() => undefined)}
                  disabled={loading}
                >
                  {loading ? "Cargando..." : "Buscar"}
                </button>
              </div>
              {categories.length > 0 ? (
                <div className="pill">Categorías detectadas: {categories.join(", ")}</div>
              ) : null}
            </div>
          </div>

          <div className="hero-card" style={{ overflowX: "auto" }}>
            {toast ? (
              <div className={`toast ${toast.kind === "error" ? "error" : ""}`} style={{ marginBottom: 12 }}>
                {toast.text}
              </div>
            ) : null}

            {products.length === 0 ? (
              <p className="status-text">{loading ? "Cargando..." : "No hay productos todavía."}</p>
            ) : (
              <table className="data-table" aria-label="Listado de productos">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th style={{ width: 170 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.name}</strong>
                        {p.description ? <div className="status-text">{p.description}</div> : null}
                      </td>
                      <td>{p.category ?? <span className="status-text">—</span>}</td>
                      <td className="menu-price">
                        {new Intl.NumberFormat("es-ES", {
                          style: "currency",
                          currency: "EUR",
                        }).format(Number(p.price))}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button className="btn btn-outline btn-small" onClick={() => openEdit(p)}>
                            Editar
                          </button>
                          <button className="btn btn-outline btn-small" onClick={() => remove(p.id)}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="hero-card" style={{ alignSelf: "stretch" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <h2 className="section-title" style={{ margin: 0 }}>
                {editor.id ? "Editar producto" : "Nuevo producto"}
              </h2>
            </div>
            <div className="table-input" style={{ marginTop: 10 }}>
              <label>Nombre</label>
              <input
                className="input"
                value={editor.name}
                onChange={(e) => setEditor((p) => ({ ...p, name: e.target.value }))}
              />
              <label>Descripción</label>
              <textarea
                className="input"
                style={{ minHeight: 90 }}
                value={editor.description}
                onChange={(e) => setEditor((p) => ({ ...p, description: e.target.value }))}
              />
              <label>Categoría</label>
              <input
                className="input"
                placeholder="Entrantes, Pastas, Postres..."
                value={editor.category}
                onChange={(e) => setEditor((p) => ({ ...p, category: e.target.value }))}
              />
              <label>Precio (EUR)</label>
              <input
                className="input"
                inputMode="decimal"
                value={editor.price}
                onChange={(e) => setEditor((p) => ({ ...p, price: e.target.value }))}
              />
              <label>Imagen (URL)</label>
              <input
                className="input"
                placeholder="https://..."
                value={editor.image_url}
                onChange={(e) => setEditor((p) => ({ ...p, image_url: e.target.value }))}
              />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
              <button
                className="btn btn-outline"
                onClick={() => setEditor(emptyEditor(restaurantId))}
                disabled={loading}
              >
                Limpiar
              </button>
              <button className="btn btn-primary" onClick={save} disabled={loading || !editor.name.trim()}>
                {loading ? "Guardando..." : editor.id ? "Guardar cambios" : "Crear producto"}
              </button>
            </div>

            <div style={{ marginTop: 18, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <h4 style={{ margin: 0 }}>Extras y Sin</h4>
              </div>

              {!editor.id ? (
                <p className="status-text" style={{ marginTop: 8 }}>
                  Guarda el producto para habilitar extras y opciones “Sin”.
                </p>
              ) : null}

              <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
                <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Extras</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  <input
                    className="input"
                    placeholder="Nombre del extra"
                    style={{ flex: "1 1 200px" }}
                    value={newExtra.label}
                    onChange={(e) => setNewExtra((p) => ({ ...p, label: e.target.value }))}
                  />
                  <button
                    className="btn btn-outline btn-small"
                    onClick={() => {
                      const name = newExtra.label.trim();
                      if (!name) return;
                      setEditor((prev) => ({ ...prev, extras: Array.from(new Set([...prev.extras, name])) }));
                      setNewExtra({ label: "" });
                    }}
                  >
                    Añadir extra
                  </button>
                </div>
                {editor.extras.length === 0 ? (
                  <p className="status-text">Sin extras configurados.</p>
                ) : (
                  <div className="admin-grid">
                    {editor.extras.map((name) => (
                      <div key={name} className="order-card" style={{ gap: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <strong>{name}</strong>
                        </div>
                        <button
                          className="btn btn-outline btn-small"
                          onClick={() =>
                            setEditor((prev) => ({
                              ...prev,
                              extras: prev.extras.filter((e) => e !== name),
                            }))
                          }
                        >
                          Eliminar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                </div>

                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Sin (quitar)</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                    <input
                      className="input"
                      placeholder="Ej. Queso, Jamón..."
                      style={{ flex: "1 1 200px" }}
                      value={newRemove.label}
                      onChange={(e) => setNewRemove({ label: e.target.value })}
                    />
                    <button
                      className="btn btn-outline btn-small"
                      onClick={() => {
                        const name = newRemove.label.trim();
                        if (!name) return;
                        setEditor((prev) => ({ ...prev, excludes: Array.from(new Set([...prev.excludes, name])) }));
                        setNewRemove({ label: "" });
                      }}
                    >
                      Añadir Sin
                    </button>
                  </div>
                  {editor.excludes.length === 0 ? (
                    <p className="status-text">Sin opciones de quitar.</p>
                  ) : (
                    <div className="admin-grid">
                      {editor.excludes.map((name) => (
                        <div key={name} className="order-card" style={{ gap: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <strong>{name}</strong>
                            <span className="status-text">Sin</span>
                          </div>
                          <button
                            className="btn btn-outline btn-small"
                            onClick={() =>
                              setEditor((prev) => ({
                                ...prev,
                                excludes: prev.excludes.filter((e) => e !== name),
                              }))
                            }
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </AdminShell>
  );
}
