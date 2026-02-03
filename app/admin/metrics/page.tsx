"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../_components/AdminShell";
import { supabase } from "@/lib/supabaseClient";

type Restaurant = { id: string; name: string; slug: string };
type Payment = { amount_total: number; created_at: string; method: "cash" | "card" };
type Order = { created_at: string };

const currency = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });

export default function MetricsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string>("");

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadRestaurants = async () => {
      const { data, error } = await client.from("restaurants").select("id,name,slug").order("name");
      if (error) return setToast("No se pudieron cargar restaurantes.");
      const list = (data ?? []) as Restaurant[];
      setRestaurants(list);
      if (!restaurantId && list.length > 0) setRestaurantId(list[0].id);
    };
    loadRestaurants().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    const client = supabase;
    if (!client || !restaurantId) return;
    setLoading(true);
    setToast(null);
    try {
      const { data: paymentsData, error: paymentsError } = await client
        .from("payments")
        .select("amount_total, created_at, method")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });
      if (paymentsError) throw paymentsError;
      setPayments((paymentsData ?? []) as Payment[]);

      const { data: ordersData, error: ordersError } = await client
        .from("orders")
        .select("created_at")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });
      if (ordersError) throw ordersError;
      setOrders((ordersData ?? []) as Order[]);
      setLastSync(new Date().toISOString());
    } catch (err) {
      setToast((err as Error).message || "No se pudieron cargar métricas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const salesByDay = useMemo(() => {
    const map = new Map<string, number>();
    payments.forEach((p) => {
      const key = formatDate(p.created_at);
      map.set(key, (map.get(key) ?? 0) + Number(p.amount_total));
    });
    return Array.from(map.entries()).slice(0, 10);
  }, [payments]);

  const avgTicket = useMemo(() => {
    if (payments.length === 0) return 0;
    const total = payments.reduce((sum, p) => sum + Number(p.amount_total), 0);
    return total / payments.length;
  }, [payments]);

  const peakHours = useMemo(() => {
    const map = new Map<number, number>();
    orders.forEach((o) => {
      const hour = new Date(o.created_at).getHours();
      map.set(hour, (map.get(hour) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [orders]);

  const exportCsv = (rows: string[][], filename: string) => {
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminShell>
      <main className="container">
        <section className="hero" style={{ alignItems: "start" }}>
          <div className="hero-card">
            <h1 className="hero-title">Datos y métricas</h1>
            <p className="hero-copy">Ventas, tickets promedio y horas pico.</p>
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              <label style={{ fontSize: 13, color: "#6f5b4c" }}>Restaurante</label>
              <select className="input" value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={() => loadData().catch(() => undefined)} disabled={loading}>
                {loading ? "Cargando..." : "Actualizar"}
              </button>
              {toast ? <div className="toast error">{toast}</div> : null}
              {lastSync ? <div className="status-text">Última sync: {formatDate(lastSync)}</div> : null}
            </div>
          </div>

          <div className="hero-card" style={{ flex: 1 }}>
            <div className="order-card">
              <strong>Ventas por día</strong>
              {salesByDay.length === 0 ? (
                <p className="status-text">Sin datos.</p>
              ) : (
                <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                  {salesByDay.map(([day, total]) => (
                    <div key={day} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>{day}</span>
                      <span className="menu-price">{currency(total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="order-card" style={{ marginTop: 12 }}>
              <strong>Ticket promedio</strong>
              <div className="menu-price" style={{ marginTop: 6 }}>
                {currency(avgTicket)}
              </div>
            </div>

            <div className="order-card" style={{ marginTop: 12 }}>
              <strong>Horas pico</strong>
              {peakHours.length === 0 ? (
                <p className="status-text">Sin datos.</p>
              ) : (
                <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                  {peakHours.map(([hour, count]) => (
                    <div key={hour} style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>{String(hour).padStart(2, "0")}:00</span>
                      <span>{count} pedidos</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="order-card" style={{ marginTop: 12 }}>
              <strong>Técnico</strong>
              <div className="status-text" style={{ marginTop: 6 }}>
                Exporta un respaldo manual en CSV.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                <button
                  className="btn btn-outline btn-small"
                  onClick={() =>
                    exportCsv(
                      [
                        ["fecha", "método", "monto"],
                        ...payments.map((p) => [String(p.created_at), String(p.method), String(p.amount_total)]),
                      ],
                      "payments.csv"
                    )
                  }
                >
                  Exportar pagos
                </button>
                <button
                  className="btn btn-outline btn-small"
                  onClick={() =>
                    exportCsv(
                      [["fecha"], ...orders.map((o) => [String(o.created_at)])],
                      "orders.csv"
                    )
                  }
                >
                  Exportar pedidos
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </AdminShell>
  );
}
