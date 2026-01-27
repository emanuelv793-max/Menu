"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
};

type OrderRecord = {
  id: number;
  table_number: string;
  items: OrderItem[];
  total: number;
  status: "new" | "preparing" | "ready";
  created_at: string;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);

const formatTime = (value: string) =>
  new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export default function AdminPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      if (mounted) setAuthChecked(true);
    };

    checkSession();
    const { data: authListener } = supabase
      ? supabase.auth.onAuthStateChange((_event, session) => {
          if (!session) {
            router.replace("/login");
          } else {
            setAuthChecked(true);
          }
        })
      : { data: undefined };

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    if (!supabase) return;
    let active = true;

    const loadOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (active && data) {
        setOrders(data as OrderRecord[]);
      }
    };

    loadOrders();

    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newOrder = payload.new as OrderRecord;
            setOrders((prev) => [newOrder, ...prev]);
          }
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as OrderRecord;
            setOrders((prev) =>
              prev.map((order) => (order.id === updated.id ? updated : order))
            );
          }
          if (payload.eventType === "DELETE") {
            const removed = payload.old as OrderRecord;
            setOrders((prev) =>
              prev.filter((order) => order.id !== removed.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      channel.unsubscribe();
    };
  }, [authChecked]);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) =>
      a.created_at < b.created_at ? 1 : -1
    );
  }, [orders]);

  const updateStatus = async (
    id: number,
    status: OrderRecord["status"]
  ) => {
    if (!supabase) return;
    const { data } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single();

    if (data) {
      setOrders((prev) =>
        prev.map((order) => (order.id === id ? (data as OrderRecord) : order))
      );
    }
  };

  const badgeClass = (status: OrderRecord["status"]) => {
    if (status === "preparing") return "badge badge-prep";
    if (status === "ready") return "badge badge-ready";
    return "badge badge-new";
  };

  const statusLabel = (status: OrderRecord["status"]) => {
    if (status === "preparing") return "preparando";
    if (status === "ready") return "listo";
    return "nuevo";
  };

  if (!hasSupabaseConfig) {
    return (
      <div className="page">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="brand">
              <div className="brand-mark">Menu Lungo</div>
              <div className="brand-sub">Cocina en vivo</div>
            </div>
          </div>
        </header>
        <main className="container">
          <p className="status-text">
            Configura Supabase en <strong>.env.local</strong> para usar la
            cocina en vivo.
          </p>
        </main>
      </div>
    );
  }

  if (!authChecked) {
    return (
      <div className="page">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="brand">
              <div className="brand-mark">Menu Lungo</div>
              <div className="brand-sub">Cocina en vivo</div>
            </div>
          </div>
        </header>
        <main className="container">
          <p className="status-text">Verificando acceso...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark">Menu Lungo</div>
            <div className="brand-sub">Cocina en vivo</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link className="nav-link" href="/">
              Volver al salón
            </Link>
            <button
              className="nav-link"
              onClick={async () => {
                await supabase?.auth.signOut();
                router.replace("/login");
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <div className="hero-card">
            <h1 className="hero-title">Pedidos en tiempo real</h1>
            <p className="hero-copy">
              Actualiza el estado de cada pedido con un toque. Los cambios se
              reflejan al instante en el salón.
            </p>
          </div>
          <div className="hero-card">
            <h2 className="section-title">Resumen</h2>
            <p className="hero-copy">
              {orders.length === 0
                ? "Sin pedidos en cola todavía."
                : `Pedidos activos: ${orders.length}`}
            </p>
          </div>
        </section>

        {sortedOrders.length === 0 ? (
          <p className="status-text" style={{ marginTop: 20 }}>
            Esperando pedidos desde el salón...
          </p>
        ) : (
          <section className="admin-grid">
            {sortedOrders.map((order) => (
              <div key={order.id} className="order-card">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <strong>Mesa {order.table_number}</strong>
                    <div className="status-text">
                      {formatTime(order.created_at)}
                    </div>
                  </div>
                  <span className={badgeClass(order.status)}>
                    {statusLabel(order.status)}
                  </span>
                </div>

                <div className="order-items">
                  {order.items.map((item) => (
                    <div key={item.id}>
                      {item.qty} × {item.name}
                    </div>
                  ))}
                </div>

                <div className="menu-price">Total: {formatCurrency(order.total)}</div>

                <div className="order-actions">
                  <button
                    className="btn btn-outline btn-small"
                    onClick={() => updateStatus(order.id, "new")}
                  >
                    Nuevo
                  </button>
                  <button
                    className="btn btn-outline btn-small"
                    onClick={() => updateStatus(order.id, "preparing")}
                  >
                    Preparando
                  </button>
                  <button
                    className="btn btn-primary btn-small"
                    onClick={() => updateStatus(order.id, "ready")}
                  >
                    Listo
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
