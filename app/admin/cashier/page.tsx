"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminShell from "../_components/AdminShell";
import { supabase } from "@/lib/supabaseClient";

type Restaurant = { id: string; name: string; slug: string };

type TableSession = {
  id: string;
  restaurant_id: string;
  table_number: string;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
};

type OrderItem = { quantity: number; price: number };

type Order = {
  id: string;
  session_id: string | null;
  status: string;
  is_paid: boolean;
  created_at: string;
  order_items?: OrderItem[];
};

type SessionWithTotals = TableSession & {
  total: number;
  itemsCount: number;
  ordersCount: number;
};

export default function CashierPage() {
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [sessions, setSessions] = useState<SessionWithTotals[]>([]);
  const [filter, setFilter] = useState<"open" | "closed">("open");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadRestaurants = async () => {
      const { data, error } = await client.from("restaurants").select("id,name,slug").order("name");
      if (error) {
        setToast("No se pudieron cargar los restaurantes.");
        return;
      }
      const list = (data ?? []) as Restaurant[];
      if (!restaurantId && list.length > 0) setRestaurantId(list[0].id);
    };
    loadRestaurants().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSessions = async () => {
    const client = supabase;
    if (!client || !restaurantId) return;
    setLoading(true);
    setToast(null);
    try {
      const { data: sessionData, error: sessionError } = await client
        .from("table_sessions")
        .select("id, restaurant_id, table_number, status, opened_at, closed_at")
        .eq("restaurant_id", restaurantId)
        .order("opened_at", { ascending: true });
      if (sessionError) throw sessionError;

      const sessions = (sessionData ?? []) as TableSession[];
      if (sessions.length === 0) {
        setSessions([]);
        return;
      }
      const ids = sessions.map((s) => s.id);
      const { data: ordersData, error: ordersError } = await client
        .from("orders")
        .select("id, session_id, status, is_paid, created_at, order_items(quantity,price)")
        .in("session_id", ids);
      if (ordersError) throw ordersError;
      const orders = (ordersData ?? []) as Order[];

      const withTotals: SessionWithTotals[] = sessions.map((s) => {
        const o = orders.filter((ord) => ord.session_id === s.id);
        const items = o.flatMap((ord) => ord.order_items ?? []);
        const total = items.reduce((sum, it) => sum + Number(it.price) * Number(it.quantity), 0);
        return {
          ...s,
          total,
          itemsCount: items.reduce((sum, it) => sum + Number(it.quantity), 0),
          ordersCount: o.length,
        };
      });
      setSessions(withTotals);
    } catch (err) {
      setToast((err as Error).message || "No se pudieron cargar las mesas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  useEffect(() => {
    if (!supabase) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      loadSessions().catch(() => undefined);
    }, 7_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const filtered = useMemo(() => {
    return sessions
      .filter((s) => (filter === "open" ? s.status === "open" : s.status === "closed"))
      .filter((s) => s.table_number.toLowerCase().includes(search.trim().toLowerCase()));
  }, [sessions, filter, search]);

  return (
    <AdminShell>
      <main className="container">
        <section className="hero" style={{ alignItems: "start" }}>
          <div className="hero-card">
            <h1 className="hero-title">Caja</h1>
            <p className="hero-copy">Gestiona mesas abiertas, cobra y cierra.</p>
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              {/* selector de restaurante oculto para despliegue individual */}

              <label style={{ fontSize: 13, color: "#6f5b4c" }}>Buscar mesa</label>
              <input
                className="input"
                placeholder="Ej. 12"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className={`btn btn-outline btn-small ${filter === "open" ? "active" : ""}`}
                  onClick={() => setFilter("open")}
                >
                  Abiertas
                </button>
                <button
                  className={`btn btn-outline btn-small ${filter === "closed" ? "active" : ""}`}
                  onClick={() => setFilter("closed")}
                >
                  Cerradas
                </button>
              </div>

              <button className="btn btn-primary" onClick={() => loadSessions().catch(() => undefined)} disabled={loading}>
                {loading ? "Actualizando..." : "Actualizar"}
              </button>
              {toast ? <div className="toast error">{toast}</div> : null}
            </div>
          </div>

          <div className="hero-card" style={{ flex: 1, minHeight: 420 }}>
            {loading ? (
              <p className="status-text">Cargando mesas...</p>
            ) : filtered.length === 0 ? (
              <p className="status-text">No hay mesas en este estado.</p>
            ) : (
              <div className="admin-grid">
                {filtered.map((s) => (
                  <Link
                    key={s.id}
                    href={`/admin/cashier/table/${encodeURIComponent(s.table_number)}`}
                    className="order-card"
                    style={{ textDecoration: "none" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong>Mesa {s.table_number}</strong>
                        <div className="status-text">
                          Apertura: {new Date(s.opened_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <span className={s.status === "open" ? "badge badge-prep" : "badge badge-served"}>
                        {s.status === "open" ? "Abierta" : "Cerrada"}
                      </span>
                    </div>
                    <div className="menu-price" style={{ marginTop: 6 }}>
                      Total: {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(s.total)}
                    </div>
                    <div className="status-text">
                      {s.ordersCount} pedidos · {s.itemsCount} ítems
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </AdminShell>
  );
}
