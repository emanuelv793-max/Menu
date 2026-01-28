"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";

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
  status: "new" | "preparing" | "ready" | "served";
  created_at: string;
  served_at?: string | null;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);

const formatTime = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";

export default function AdminPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [actionStatus, setActionStatus] = useState("");
  const beepIntervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastBeepRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const client = supabase;
      if (!client) return;
      const { data } = await client.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      if (mounted) setAuthChecked(true);
    };

    checkSession();
    const client = supabase;
    const { data: authListener } = client
      ? client.auth.onAuthStateChange((_event, session) => {
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
    const enableAudio = async () => {
      if (audioCtxRef.current) return;
      const ctx = new AudioContext();
      try {
        await ctx.resume();
      } catch {
        // Ignore resume errors
      }
      audioCtxRef.current = ctx;
      setAudioReady(true);
    };

    const onFirstInteraction = () => {
      enableAudio();
      window.removeEventListener("click", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
      window.removeEventListener("touchstart", onFirstInteraction);
    };

    window.addEventListener("click", onFirstInteraction);
    window.addEventListener("keydown", onFirstInteraction);
    window.addEventListener("touchstart", onFirstInteraction);

    return () => {
      window.removeEventListener("click", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
      window.removeEventListener("touchstart", onFirstInteraction);
    };
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    const client = supabase;
    if (!client) return;
    let active = true;

    const loadOrders = async (db: SupabaseClient) => {
      const { data } = await db
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (active && data) {
        setOrders(data as OrderRecord[]);
      }
    };

    loadOrders(client);

    const channel = client
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

  useEffect(() => {
    const hasNewOrders = orders.some((order) => order.status === "new");
    if (!hasNewOrders) {
      if (beepIntervalRef.current) {
        window.clearInterval(beepIntervalRef.current);
        beepIntervalRef.current = null;
      }
      return;
    }

    if (!beepIntervalRef.current) {
      beepIntervalRef.current = window.setInterval(() => {
        const now = Date.now();
        if (now - lastBeepRef.current < 1800) return;
        lastBeepRef.current = now;

        const ctx = audioCtxRef.current;
        if (!ctx) return;
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => undefined);
        }

        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "square";
        oscillator.frequency.value = 740;
        gain.gain.value = 0.06;
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.25);
      }, 2000);
    }

    return () => {
      if (beepIntervalRef.current) {
        window.clearInterval(beepIntervalRef.current);
        beepIntervalRef.current = null;
      }
    };
  }, [orders]);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) =>
      a.created_at < b.created_at ? 1 : -1
    );
  }, [orders]);

  const updateStatus = async (
    id: number,
    status: OrderRecord["status"]
  ) => {
    const client = supabase;
    if (!client) return;
    setActionStatus("");
    const servedAt =
      status === "served" ? new Date().toISOString() : undefined;
    const payload: Partial<OrderRecord> =
      status === "served"
        ? { status, served_at: servedAt }
        : { status };

    const { data, error } = await client
      .from("orders")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      setActionStatus(
        `No se pudo actualizar el pedido: ${error.message || "error"}`
      );
      return;
    }

    if (data) {
      setOrders((prev) =>
        prev.map((order) => (order.id === id ? (data as OrderRecord) : order))
      );
    }
  };

  const badgeClass = (status: OrderRecord["status"]) => {
    if (status === "preparing") return "badge badge-prep";
    if (status === "ready") return "badge badge-ready";
    if (status === "served") return "badge badge-served";
    return "badge badge-new";
  };

  const statusLabel = (status: OrderRecord["status"]) => {
    if (status === "preparing") return "preparando";
    if (status === "ready") return "listo";
    if (status === "served") return "servido";
    return "nuevo";
  };

  const cardClass = (status: OrderRecord["status"]) => {
    if (status === "preparing") return "order-card status-preparing";
    if (status === "ready") return "order-card status-ready";
    if (status === "served") return "order-card status-served";
    return "order-card status-new";
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

  const activeOrders = sortedOrders.filter((order) => order.status !== "served");
  const servedOrders = sortedOrders.filter((order) => order.status === "served");

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark">Menu Lungo</div>
            <div className="brand-sub">Cocina en vivo</div>
          </div>
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

        {!audioReady ? (
          <p className="status-text" style={{ marginTop: 12 }}>
            Activa el sonido con un clic para alertas de pedidos nuevos.
          </p>
        ) : null}
        {actionStatus ? (
          <p className="status-text" style={{ marginTop: 8 }}>
            {actionStatus}
          </p>
        ) : null}

        {activeOrders.length === 0 ? (
          <p className="status-text" style={{ marginTop: 20 }}>
            Esperando pedidos desde el salón...
          </p>
        ) : (
          <section className="admin-grid">
            {activeOrders.map((order) => (
              <div key={order.id} className={cardClass(order.status)}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <strong>Mesa {order.table_number}</strong>
                    <div className="status-text">
                      Pedido: {formatTime(order.created_at)}
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

                <div className="menu-price">
                  Total: {formatCurrency(order.total)}
                </div>

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
                  {order.status === "ready" ? (
                    <button
                      className="btn btn-outline btn-small"
                      onClick={() => updateStatus(order.id, "served")}
                    >
                      Servido
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </section>
        )}

        {servedOrders.length > 0 ? (
          <section style={{ marginTop: 32 }}>
            <h3 className="section-title">Servidos</h3>
            <div className="admin-grid">
              {servedOrders.map((order) => (
                <div key={order.id} className={cardClass(order.status)}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <strong>Mesa {order.table_number}</strong>
                      <div className="status-text">
                        Pedido: {formatTime(order.created_at)}
                      </div>
                      <div className="status-text">
                        Servido: {formatTime(order.served_at)}
                      </div>
                    </div>
                    <span className={badgeClass(order.status)}>
                      {statusLabel(order.status)}
                    </span>
                  </div>
                  <div className="menu-price">
                    Total: {formatCurrency(order.total)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
