"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/app/admin/_components/AdminShell";
import { supabase } from "@/lib/supabaseClient";

type Restaurant = { id: string; name: string; slug: string };
type Session = {
  id: string;
  restaurant_id: string;
  table_number: string;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
};

type Modifier = { label: string; type: "remove" | "extra"; price?: number };
type ModifierRow = {
  order_item_id: string;
  label: string;
  type: "remove" | "extra";
  price: number | string | null;
};
type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  note: string | null;
  products?: { name: string | null } | null;
  order_item_modifiers?: Modifier[] | null;
};

type Order = {
  id: string;
  status: string;
  is_paid: boolean;
  created_at: string;
  order_items: OrderItem[];
};

type OrderItemRow = {
  id: string;
  quantity: number | string;
  price: number | string;
  note: string | null;
  products?: { name: string | null } | Array<{ name: string | null }> | null;
};

type OrderRow = {
  id: string;
  status: string;
  is_paid: boolean;
  created_at: string;
  order_items?: OrderItemRow[] | null;
};

type Payment = {
  id: string;
  method: "cash" | "card";
  amount_total: number;
  created_at: string;
};

const currency = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

export default function CashierTablePage() {
  const params = useParams<{ table: string }>();
  const tableNumber = decodeURIComponent(params?.table ?? "");
  const router = useRouter();

  const [restaurantId, setRestaurantId] = useState<string>("");
  const [session, setSession] = useState<Session | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showPay, setShowPay] = useState(false);
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [amount, setAmount] = useState<string>("0");
  const [splitParts, setSplitParts] = useState<string>("2");
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    client.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadRestaurants = async () => {
      const { data } = await client.from("restaurants").select("id,name,slug").order("name");
      const list = (data ?? []) as Restaurant[];
      if (!restaurantId && list.length > 0) setRestaurantId(list[0].id);
    };
    loadRestaurants().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSession = async () => {
    const client = supabase;
    if (!client || !restaurantId) return;
    setLoading(true);
    setToast(null);
    try {
      const { data: sessData, error: sessError } = await client
        .from("table_sessions")
        .select("id, restaurant_id, table_number, status, opened_at, closed_at")
        .eq("restaurant_id", restaurantId)
        .eq("table_number", tableNumber)
        .eq("status", "open")
        .maybeSingle();
      if (sessError) throw sessError;
      if (!sessData) {
        setSession(null);
        setOrders([]);
        setToast("No hay sesión abierta para esta mesa.");
        return;
      }
      const session = sessData as Session;
      setSession(session);
      const { data: ordersData, error: ordersError } = await client
        .from("orders")
        .select(
          "id, status, is_paid, created_at, order_items(id, quantity, price, note, products(name))"
        )
        .eq("session_id", session.id)
        .order("created_at");
      if (ordersError) throw ordersError;
      const orderRows = (ordersData ?? []) as OrderRow[];
      const normalized: Order[] = orderRows.map((o) => ({
        id: o.id,
        status: o.status,
        is_paid: o.is_paid,
        created_at: o.created_at,
        order_items: (o.order_items ?? []).map((it) => ({
          id: it.id,
          quantity: Number(it.quantity),
          price: Number(it.price),
          note: it.note,
          products: Array.isArray(it.products)
            ? { name: it.products[0]?.name ?? null }
            : { name: it.products?.name ?? null },
        })),
      }));
      const itemIds = normalized.flatMap((o) => o.order_items.map((it) => it.id));
      if (itemIds.length > 0) {
        const { data: modsData, error: modsError } = await client
          .from("order_item_modifiers")
          .select("order_item_id, label, type, price")
          .in("order_item_id", itemIds);
        if (!modsError && modsData) {
          const modifierRows = modsData as ModifierRow[];
          const modsByItem = new Map<string, Modifier[]>();
          modifierRows.forEach((m) => {
            const list = modsByItem.get(m.order_item_id) ?? [];
            list.push({ label: m.label, type: m.type, price: Number(m.price ?? 0) });
            modsByItem.set(m.order_item_id, list);
          });
          normalized.forEach((o) => {
            o.order_items = o.order_items.map((it) => ({
              ...it,
              order_item_modifiers: modsByItem.get(it.id) ?? [],
            }));
          });
        }
      }
      setOrders(normalized);

      const { data: paymentsData, error: paymentsError } = await client
        .from("payments")
        .select("id, method, amount_total, created_at")
        .eq("session_id", session.id)
        .order("created_at", { ascending: true });
      if (paymentsError) throw paymentsError;
      setPayments((paymentsData ?? []) as Payment[]);
    } catch (err) {
      setToast((err as Error).message || "No se pudo cargar la mesa.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, tableNumber]);

  const total = useMemo(() => {
    return orders
      .flatMap((o) => o.order_items)
      .reduce((sum, it) => sum + Number(it.price) * Number(it.quantity), 0);
  }, [orders]);

  const paidTotal = useMemo(
    () => payments.reduce((sum, p) => sum + Number(p.amount_total), 0),
    [payments]
  );

  const remaining = useMemo(() => Math.max(0, total - paidTotal), [total, paidTotal]);

  const printTicket = () => {
    window.print();
  };

  const handlePay = async () => {
    const client = supabase;
    if (!client || !session) return;
    setPaying(true);
    setToast(null);
    try {
      const amountNumber = Number(String(amount).replace(",", "."));
      if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
        throw new Error("Monto inválido.");
      }
      if (amountNumber > remaining + 0.01) {
        throw new Error("El monto supera lo pendiente.");
      }
      const { error: payError } = await client.from("payments").insert([
        {
          restaurant_id: session.restaurant_id,
          session_id: session.id,
          method,
          amount_total: amountNumber,
          created_by: userId,
        },
      ]);
      if (payError) throw payError;

      const newPaidTotal = paidTotal + amountNumber;
      if (newPaidTotal >= total - 0.01) {
        const { error: sessUpdateError } = await client
          .from("table_sessions")
          .update({
            status: "closed",
            closed_at: new Date().toISOString(),
            closed_by: userId,
          })
          .eq("id", session.id);
        if (sessUpdateError) throw sessUpdateError;

        const { error: ordersUpdateError } = await client
          .from("orders")
          .update({ is_paid: true })
          .eq("session_id", session.id);
        if (ordersUpdateError) throw ordersUpdateError;
      }

      setToast(newPaidTotal >= total - 0.01 ? "Pago registrado y mesa cerrada." : "Pago parcial registrado.");
      setShowPay(false);
      await loadSession();
      if (newPaidTotal >= total - 0.01) {
        router.push("/admin/cashier");
      }
    } catch (err) {
      setToast((err as Error).message || "No se pudo registrar el pago.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <AdminShell>
      <main className="container">
        <section className="hero" style={{ alignItems: "start" }}>
          <div className="hero-card">
            <h1 className="hero-title">Mesa {tableNumber}</h1>
            <p className="hero-copy">Detalle de la cuenta y cobro.</p>
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              {/* selector de restaurante oculto para despliegue individual */}
              <button className="btn btn-outline btn-small" onClick={() => loadSession().catch(() => undefined)} disabled={loading}>
                {loading ? "Cargando..." : "Recargar"}
              </button>
              {toast ? <div className="toast error">{toast}</div> : null}
            </div>
          </div>

          <div className="hero-card" style={{ flex: 1 }}>
            {loading ? (
              <p className="status-text">Cargando cuenta...</p>
            ) : !session ? (
              <p className="status-text">No hay sesión abierta para esta mesa.</p>
            ) : orders.length === 0 ? (
              <p className="status-text">No hay pedidos asociados.</p>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {orders.map((order) => (
                  <div key={order.id} className="order-card">
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <strong>Pedido</strong>
                        <div className="status-text">
                          {new Date(order.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <span className={order.is_paid ? "badge badge-served" : "badge badge-prep"}>
                        {order.is_paid ? "Pagado" : "Pendiente"}
                      </span>
                    </div>
                    <div className="order-items">
                      {order.order_items.map((item, idx) => {
                        const mods =
                          item.order_item_modifiers?.map((m) => `${m.type === "extra" ? "+" : "-"} ${m.label}`) ?? [];
                        return (
                          <div key={idx} style={{ marginBottom: 6 }}>
                            {item.quantity} × {item.products?.name ?? "Producto"}
                            {mods.length > 0 ? ` · ${mods.join(" · ")}` : ""}
                            {item.note ? ` · ${item.note}` : ""}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="order-card" style={{ background: "#f9f1e7" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>Total</strong>
                    <span className="menu-price">{currency(total)}</span>
                  </div>
                  <div className="status-text" style={{ marginTop: 6 }}>
                    Pagado: {currency(paidTotal)} · Pendiente: {currency(remaining)}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button className="btn btn-outline" onClick={printTicket}>
                      Imprimir ticket
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        setAmount(remaining.toFixed(2));
                        setShowPay(true);
                      }}
                      disabled={paying || remaining <= 0}
                    >
                      Cobrar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {showPay ? (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>Cobrar mesa {tableNumber}</h3>
            <p>Total: {currency(total)} · Pendiente: {currency(remaining)}</p>
            <div style={{ display: "flex", gap: 10, margin: "10px 0" }}>
              <button
                className={`btn btn-outline ${method === "cash" ? "active" : ""}`}
                onClick={() => setMethod("cash")}
              >
                Efectivo
              </button>
              <button
                className={`btn btn-outline ${method === "card" ? "active" : ""}`}
                onClick={() => setMethod("card")}
              >
                Tarjeta
              </button>
            </div>
            <label style={{ fontSize: 13 }}>Monto a cobrar</label>
            <input
              className="input"
              value={amount}
              inputMode="decimal"
              onChange={(e) => setAmount(e.target.value)}
            />
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Dividir cuenta</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  className="input"
                  style={{ maxWidth: 120 }}
                  inputMode="numeric"
                  value={splitParts}
                  onChange={(e) => setSplitParts(e.target.value)}
                />
                <button
                  className="btn btn-outline btn-small"
                  onClick={() => {
                    const parts = Math.max(1, Number(splitParts));
                    if (!Number.isFinite(parts)) return;
                    setAmount((remaining / parts).toFixed(2));
                  }}
                >
                  Partes iguales
                </button>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Por ítems</div>
                <div style={{ display: "grid", gap: 6 }}>
                  {orders.flatMap((o) => o.order_items).map((it) => {
                    const key = it.id;
                    const checked = Boolean(selectedItems[key]);
                    return (
                      <label key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedItems((prev) => ({ ...prev, [key]: e.target.checked }))
                          }
                        />
                        <span>
                          {it.quantity} × {it.products?.name ?? "Producto"} ({currency(Number(it.price) * Number(it.quantity))})
                        </span>
                      </label>
                    );
                  })}
                </div>
                <button
                  className="btn btn-outline btn-small"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    const items = orders.flatMap((o) => o.order_items);
                    const sum = items.reduce((acc, it) => {
                      if (!selectedItems[it.id]) return acc;
                      return acc + Number(it.price) * Number(it.quantity);
                    }, 0);
                    if (sum > 0) setAmount(sum.toFixed(2));
                  }}
                >
                  Cobrar ítems seleccionados
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <button className="btn btn-outline" onClick={() => setShowPay(false)} disabled={paying}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handlePay} disabled={paying || remaining <= 0}>
                {paying ? "Registrando..." : "Confirmar cobro"}
              </button>
            </div>
            {toast ? <p className="status-text" style={{ marginTop: 8 }}>{toast}</p> : null}
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
