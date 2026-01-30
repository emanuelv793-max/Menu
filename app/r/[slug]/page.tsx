"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { loadCart, loadTable, saveCart, saveTable, type CartState } from "@/lib/cart";

const STATUS_SEND = "enviado" as const;

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
};

export default function RestaurantPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartState>({ table: "", lines: [] });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [forceTableModal, setForceTableModal] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const current = loadCart(slug);
    const table = loadTable(slug);
    setCart({ table: table || current.table, lines: current.lines });
  }, [slug]);

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
      if (rest) {
        const { data: prods } = await client
          .from("products")
          .select("*")
          .eq("restaurant_id", rest.id)
          .order("name");
        setProducts((prods as Product[]) ?? []);
      }
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

  const cartLines = useMemo(() => {
    return cart.lines
      .map((line) => {
        const product = menuById.get(line.productId);
        if (!product) return null;
        return {
          ...product,
          qty: line.qty,
          note: line.note,
          lineTotal: Number(product.price) * line.qty,
        };
      })
      .filter(Boolean) as {
      id: string;
      name: string;
      price: number;
      qty: number;
      note?: string;
      lineTotal: number;
    }[];
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
    if (!ensureTable()) return;
    setCart((prev) => {
      const existing = prev.lines.find((l) => l.productId === productId);
      if (existing) {
        return {
          ...prev,
          lines: prev.lines.map((l) =>
            l.productId === productId ? { ...l, qty: l.qty + 1 } : l
          ),
        };
      }
      return { ...prev, lines: [...prev.lines, { productId, qty: 1 }] };
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => ({
      ...prev,
      lines: prev.lines
        .map((l) =>
          l.productId === productId ? { ...l, qty: l.qty + delta } : l
        )
        .filter((l) => l.qty > 0),
    }));
  };

  const updateNote = (productId: string, note: string) => {
    setCart((prev) => ({
      ...prev,
      lines: prev.lines.map((l) =>
        l.productId === productId ? { ...l, note } : l
      ),
    }));
  };

  const removeLine = (productId: string) => {
    setCart((prev) => ({
      ...prev,
      lines: prev.lines.filter((l) => l.productId !== productId),
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
    if (!supabase || !restaurant) return;
    setLoading(true);
    setStatus("");

    const { data: order, error } = await supabase
      .from("orders")
      .insert([
        {
          restaurant_id: restaurant.id,
          table_number: cart.table.trim(),
          status: STATUS_SEND,
          total,
        },
      ])
      .select("id")
      .single();

    if (error || !order?.id) {
      setStatus("No se pudo enviar el pedido.");
      setLoading(false);
      setConfirming(false);
      return;
    }

    const itemsPayload = cartLines.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.qty,
      note: item.note ?? null,
      price: item.price,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(itemsPayload);

    if (itemsError) {
      setStatus("No se pudieron guardar los ítems.");
      setLoading(false);
      setConfirming(false);
      return;
    }

    setCart({ table: cart.table, lines: [] });
    setStatus("Pedido enviado a cocina.");
    setLoading(false);
    setConfirming(false);
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
            <div className="menu-grid">
              {products.map((item) => (
                <div key={item.id} className="menu-card">
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

          <aside className="cart">
            <h3 className="section-title">Tu carrito</h3>
            {cartLines.length === 0 ? (
              <p className="status-text">Aún no hay productos.</p>
            ) : (
              cartLines.map((item) => (
                <div key={item.id} className="cart-item">
                  <div>
                    <strong>{item.name}</strong>
                    <div className="status-text">
                      {item.qty} × {Number(item.price).toFixed(2)} €
                    </div>
                    <textarea
                      placeholder="Nota para cocina"
                      style={{ width: "100%", minHeight: 50, marginTop: 6 }}
                      value={item.note ?? ""}
                      onChange={(e) => updateNote(item.id, e.target.value)}
                    />
                  </div>
                  <div className="cart-controls">
                    <button
                      className="btn btn-outline btn-small"
                      onClick={() => updateQty(item.id, -1)}
                    >
                      -
                    </button>
                    <span>{item.qty}</span>
                    <button
                      className="btn btn-outline btn-small"
                      onClick={() => updateQty(item.id, 1)}
                    >
                      +
                    </button>
                    <button
                      className="btn btn-outline btn-small"
                      onClick={() => removeLine(item.id)}
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

      {confirming ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Confirmar envío</h3>
            <p>Mesa {cart.table}</p>
            <ul>
              {cartLines.map((line) => (
                <li key={line.id}>
                  {line.qty} × {line.name} ({line.lineTotal.toFixed(2)} €)
                  {line.note ? ` · Nota: ${line.note}` : ""}
                </li>
              ))}
            </ul>
            <p>Total: {total.toFixed(2)} €</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-outline" onClick={() => setConfirming(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={confirmSend} disabled={loading}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
