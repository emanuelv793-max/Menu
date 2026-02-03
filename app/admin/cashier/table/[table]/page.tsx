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
type OrderItem = {
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

const currency = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

export default function CashierTablePage() {
  const params = useParams<{ table: string }>();
  const tableNumber = decodeURIComponent(params?.table ?? "");
  const router = useRouter();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [session, setSession] = useState<Session | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showPay, setShowPay] = useState(false);
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const loadRestaurants = async () => {
      const { data } = await supabase.from("restaurants").select("id,name,slug").order("name");
      const list = (data ?? []) as Restaurant[];
      setRestaurants(list);
      if (!restaurantId && list.length > 0) setRestaurantId(list[0].id);
    };
    loadRestaurants().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSession = async () => {
    if (!supabase || !restaurantId) return;
    setLoading(true);
    setToast(null);
    try {
      const { data: sessData, error: sessError } = await supabase
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
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(
          "id, status, is_paid, created_at, order_items(quantity, price, note, products(name), order_item_modifiers(label,type,price))"
        )
        .eq("session_id", session.id)
        .order("created_at");
      if (ordersError) throw ordersError;
      setOrders((ordersData ?? []) as Order[]);
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

  const printTicket = () => {
    window.print();
  };

  const handlePay = async () => {
    if (!supabase || !session) return;
    setPaying(true);
    setToast(null);
    try {
      const { error: payError } = await supabase.from("payments").insert([
        {
          restaurant_id: session.restaurant_id,
          session_id: session.id,
          method,
          amount_total: total,
          created_by: userId,
        },
      ]);
      if (payError) throw payError;

      const { error: sessUpdateError } = await supabase
        .from("table_sessions")
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
          closed_by: userId,
        })
        .eq("id", session.id);
      if (sessUpdateError) throw sessUpdateError;

      const { error: ordersUpdateError } = await supabase
        .from("orders")
        .update({ is_paid: true })
        .eq("session_id", session.id);
      if (ordersUpdateError) throw ordersUpdateError;

      setToast("Pago registrado y mesa cerrada.");
      router.push("/admin/cashier");
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
              <label style={{ fontSize: 13, color: "#6f5b4c" }}>Restaurante</label>
              <select className="input" value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
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
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button className="btn btn-outline" onClick={printTicket}>
                      Imprimir ticket
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowPay(true)} disabled={paying}>
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
            <p>Total: {currency(total)}</p>
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
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btn-outline" onClick={() => setShowPay(false)} disabled={paying}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handlePay} disabled={paying || total <= 0}>
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
