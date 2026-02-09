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

const formatShortDate = (value: Date) =>
  value.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });

const startOfDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

const addDays = (value: Date, days: number) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate() + days);

const dateKey = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
    value.getDate()
  ).padStart(2, "0")}`;

const RANGE_OPTIONS = [7, 30, 90] as const;
const FETCH_DAYS = 90;

export default function MetricsPage() {
  const [restaurantId, setRestaurantId] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string>("");
  const [rangeDays, setRangeDays] = useState<number>(30);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadRestaurants = async () => {
      const { data, error } = await client.from("restaurants").select("id,name,slug").order("name");
      if (error) return setToast("No se pudieron cargar restaurantes.");
      const list = (data ?? []) as Restaurant[];
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
      const now = new Date();
      const fetchStart = addDays(startOfDay(now), -(FETCH_DAYS - 1));
      const fromIso = fetchStart.toISOString();

      const { data: paymentsData, error: paymentsError } = await client
        .from("payments")
        .select("amount_total, created_at, method")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", fromIso)
        .order("created_at", { ascending: false });
      if (paymentsError) throw paymentsError;
      setPayments((paymentsData ?? []) as Payment[]);

      const { data: ordersData, error: ordersError } = await client
        .from("orders")
        .select("created_at")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", fromIso)
        .order("created_at", { ascending: false });
      if (ordersError) throw ordersError;
      setOrders((ordersData ?? []) as Order[]);
      setLastSync(new Date().toISOString());
    } catch (err) {
      setToast((err as Error).message || "No se pudieron cargar metricas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayStartMs = todayStart.getTime();
  const weekStartMs = addDays(todayStart, -6).getTime();
  const monthStartMs = addDays(todayStart, -29).getTime();
  const rangeStartMs = addDays(todayStart, -(rangeDays - 1)).getTime();

  const paymentsRange = useMemo(
    () => payments.filter((p) => new Date(p.created_at).getTime() >= rangeStartMs),
    [payments, rangeStartMs]
  );

  const ordersRange = useMemo(
    () => orders.filter((o) => new Date(o.created_at).getTime() >= rangeStartMs),
    [orders, rangeStartMs]
  );

  const salesToday = useMemo(
    () =>
      payments
        .filter((p) => new Date(p.created_at).getTime() >= todayStartMs)
        .reduce((sum, p) => sum + Number(p.amount_total), 0),
    [payments, todayStartMs]
  );

  const salesWeek = useMemo(
    () =>
      payments
        .filter((p) => new Date(p.created_at).getTime() >= weekStartMs)
        .reduce((sum, p) => sum + Number(p.amount_total), 0),
    [payments, weekStartMs]
  );

  const salesMonth = useMemo(
    () =>
      payments
        .filter((p) => new Date(p.created_at).getTime() >= monthStartMs)
        .reduce((sum, p) => sum + Number(p.amount_total), 0),
    [payments, monthStartMs]
  );

  const ordersToday = useMemo(
    () => orders.filter((o) => new Date(o.created_at).getTime() >= todayStartMs).length,
    [orders, todayStartMs]
  );

  const ordersWeek = useMemo(
    () => orders.filter((o) => new Date(o.created_at).getTime() >= weekStartMs).length,
    [orders, weekStartMs]
  );

  const ordersMonth = useMemo(
    () => orders.filter((o) => new Date(o.created_at).getTime() >= monthStartMs).length,
    [orders, monthStartMs]
  );

  const totalRangeSales = useMemo(
    () => paymentsRange.reduce((sum, p) => sum + Number(p.amount_total), 0),
    [paymentsRange]
  );

  const avgTicketRange = useMemo(() => {
    if (paymentsRange.length === 0) return 0;
    return totalRangeSales / paymentsRange.length;
  }, [paymentsRange, totalRangeSales]);

  const methodTotals = useMemo(() => {
    return paymentsRange.reduce(
      (acc, p) => {
        const key = p.method === "card" ? "card" : "cash";
        acc[key] += Number(p.amount_total);
        return acc;
      },
      { cash: 0, card: 0 }
    );
  }, [paymentsRange]);

  const peakHours = useMemo(() => {
    const map = new Map<number, number>();
    ordersRange.forEach((o) => {
      const hour = new Date(o.created_at).getHours();
      map.set(hour, (map.get(hour) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [ordersRange]);

  const chartSeries = useMemo(() => {
    const start = new Date(rangeStartMs);
    const days = Array.from({ length: rangeDays }, (_, idx) => {
      const day = addDays(start, idx);
      return { key: dateKey(day), label: formatShortDate(day), total: 0 };
    });

    const totals = new Map<string, number>();
    paymentsRange.forEach((p) => {
      const key = dateKey(startOfDay(new Date(p.created_at)));
      totals.set(key, (totals.get(key) ?? 0) + Number(p.amount_total));
    });

    days.forEach((day) => {
      day.total = totals.get(day.key) ?? 0;
    });

    return days;
  }, [paymentsRange, rangeDays, rangeStartMs]);

  const maxTotal = chartSeries.reduce((max, point) => Math.max(max, point.total), 0);
  const labelInterval = Math.max(1, Math.ceil(rangeDays / 7));
  const isEmpty = !loading && !toast && paymentsRange.length === 0 && ordersRange.length === 0;

  const exportCsv = (rows: string[][], filename: string) => {
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
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
            <h1 className="hero-title">Datos y metricas</h1>
            <p className="hero-copy">Ventas, tickets promedio y horas pico.</p>

            <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
              <div className="range-toggle">
                {RANGE_OPTIONS.map((days) => (
                  <button
                    key={days}
                    className={`chip ${rangeDays === days ? "chip-active" : ""}`}
                    onClick={() => setRangeDays(days)}
                  >
                    Ultimos {days} dias
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  className="btn btn-primary"
                  onClick={() => loadData().catch(() => undefined)}
                  disabled={loading}
                >
                  {loading ? "Cargando..." : "Actualizar"}
                </button>
                <div className="status-text">
                  Ultima sync: {lastSync ? formatDate(lastSync) : "--"}
                </div>
              </div>

              {toast ? <div className="toast error">{toast}</div> : null}
            </div>
          </div>

          <div className="hero-card" style={{ flex: 1 }}>
            <div className="metrics-kpis">
              <div className="metrics-kpi" title="Ventas y pedidos de hoy">
                <span className="status-text">Hoy</span>
                <strong>{currency(salesToday)}</strong>
                <span className="status-text">{ordersToday} pedidos</span>
              </div>
              <div className="metrics-kpi" title="Ventas y pedidos de la semana">
                <span className="status-text">Semana</span>
                <strong>{currency(salesWeek)}</strong>
                <span className="status-text">{ordersWeek} pedidos</span>
              </div>
              <div className="metrics-kpi" title="Ventas y pedidos del mes">
                <span className="status-text">Mes</span>
                <strong>{currency(salesMonth)}</strong>
                <span className="status-text">{ordersMonth} pedidos</span>
              </div>
            </div>

            <div className="pill" style={{ marginTop: 12 }}>
              Rango {rangeDays} dias: {currency(totalRangeSales)} · {ordersRange.length} pedidos
            </div>
          </div>
        </section>

        <section className="metrics-grid">
          <div className="hero-card">
            <div className="metrics-chart">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>Ventas por dia</strong>
                <span className="status-text">Ultimos {rangeDays} dias</span>
              </div>

              {loading ? (
                <div className="metrics-empty">Cargando metricas...</div>
              ) : isEmpty ? (
                <div className="metrics-empty">
                  Sin datos en los ultimos {rangeDays} dias. Prueba otro rango.
                </div>
              ) : (
                <div className="metrics-chart-bars">
                  {chartSeries.map((point, idx) => {
                    const height = maxTotal > 0 ? Math.max(6, (point.total / maxTotal) * 160) : 6;
                    const showLabel = idx % labelInterval === 0 || idx === chartSeries.length - 1;
                    return (
                      <div
                        key={point.key}
                        className="metrics-bar-wrap"
                        title={`${point.label}: ${currency(point.total)}`}
                      >
                        <div className="metrics-bar" style={{ height }} />
                        <span className="metrics-bar-label">{showLabel ? point.label : ""}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="hero-card" style={{ display: "grid", gap: 12 }}>
            <div className="order-card">
              <strong>Ticket promedio</strong>
              <div className="menu-price" style={{ marginTop: 6 }}>
                {currency(avgTicketRange)}
              </div>
              <div className="status-text">Basado en pagos del rango.</div>
            </div>

            <div className="order-card">
              <strong>Pagos por metodo</strong>
              {paymentsRange.length === 0 ? (
                <p className="status-text">Sin pagos en el rango.</p>
              ) : (
                <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Efectivo</span>
                    <span className="menu-price">{currency(methodTotals.cash)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Tarjeta</span>
                    <span className="menu-price">{currency(methodTotals.card)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="order-card">
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

            <div className="order-card">
              <strong>Acciones</strong>
              <div className="status-text" style={{ marginTop: 6 }}>
                Exporta un respaldo manual en CSV.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                <button
                  className="btn btn-outline btn-small"
                  onClick={() =>
                    exportCsv(
                      [
                        ["fecha", "metodo", "monto"],
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
                    exportCsv([["fecha"], ...orders.map((o) => [String(o.created_at)])], "orders.csv")
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
