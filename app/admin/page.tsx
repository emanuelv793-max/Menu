"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";
import AdminShell from "./_components/AdminShell";

type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  note?: string | null;
  modifiers?: { label: string; type: "remove" | "extra" }[];
};

type OrderItemRecord = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  note: string | null;
  price: number;
  products?: { name: string | null } | null;
  order_item_modifiers?: { label: string; type: "remove" | "extra" }[] | null;
};

type OrderRecord = {
  id: string;
  restaurant_id: string;
  table_number: string;
  items?: OrderItem[];
  order_items?: OrderItemRecord[];
  total: number;
  status: "enviado" | "preparando" | "listo" | "entregado";
  created_at: string;
  served_at?: string | null;
};

type Restaurant = {
  id: string;
  name: string;
  slug: string;
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
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [audioReady, setAudioReady] = useState(false);
  const [actionStatus, setActionStatus] = useState("");
  const [showServed, setShowServed] = useState(false);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | "all">("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "enviado" | "preparando" | "listo" | "entregado"
  >("all");
  const beepIntervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastBeepRef = useRef(0);
  const productNameCache = useRef<Map<string, string>>(new Map());
  const refreshTimerRef = useRef<number | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string>("");

const buildItems = (order: OrderRecord): OrderItem[] => {
  if (order.items) return order.items;
  return (
    order.order_items?.map((i) => ({
      id: i.id || i.product_id,
      qty: i.quantity,
      name: i.products?.name ?? i.product_id,
      note: i.note,
      price: i.price,
      modifiers: (i.order_item_modifiers ?? []).map((m) => ({
        label: m.label,
        type: m.type,
      })),
    })) ?? []
  );
};

const fetchOrderItems = async (db: SupabaseClient, orderId: string) => {
  const { data } = await db
    .from("order_items")
    .select(
      "id, order_id, product_id, quantity, note, price, products(name), order_item_modifiers(label,type)"
    )
    .eq("order_id", orderId);
  return data as OrderItemRecord[] | null;
};

const fetchOrderWithItems = async (
  db: SupabaseClient,
  id: string
): Promise<OrderRecord | null> => {
  const { data } = await db
    .from("orders")
    .select(
        "*, order_items(id, order_id, product_id, quantity, note, price, products(name), order_item_modifiers(label,type))"
      )
    .eq("id", id)
    .single();
  return (data as OrderRecord) ?? null;
};

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
    const client = supabase;
    if (!client) return;
    let active = true;

    const loadData = async (db: SupabaseClient) => {
      const { data: restData } = await db
        .from("restaurants")
        .select("id,name,slug")
        .order("name");
      if (active && restData) {
        setRestaurants(restData as Restaurant[]);
        if (restaurantId === "all" && restData.length === 1) {
          setRestaurantId(restData[0].id);
        }
      }

      const query = db
        .from("orders")
        .select(
          "*, order_items(id, order_id, product_id, quantity, note, price, products(name), order_item_modifiers(label,type))"
        )
        .order("created_at", { ascending: true });

      if (restaurantId !== "all") {
        query.eq("restaurant_id", restaurantId);
      }

      const { data: ordersData } = await query;
      if (active && ordersData) {
        const enriched = await Promise.all(
          (ordersData as unknown as OrderRecord[]).map(async (order) => {
            const items =
              order.order_items && order.order_items.length > 0
                ? order.order_items
                : await fetchOrderItems(db, order.id);
            return { ...order, order_items: items ?? order.order_items };
          })
        );
        setOrders(enriched);
        setLastSyncAt(new Date().toISOString());
      }
    };

    loadData(client);

    if (!refreshTimerRef.current) {
      refreshTimerRef.current = window.setInterval(() => {
        if (document.visibilityState !== "visible") return;
        loadData(client).catch(() => undefined);
      }, 5_000);
    }

    const channel = client
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const orderId = (payload.new as { id: string }).id;
            const fullOrder =
              (await fetchOrderWithItems(client, orderId)) ||
              ((payload.new as OrderRecord) ?? null);
            if (!fullOrder) return;
            setOrders((prev) => [
              ...prev.filter((order) => order.id !== fullOrder.id),
              fullOrder,
            ]);
          }
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as OrderRecord;
            const full =
              (await fetchOrderWithItems(client, updated.id)) ?? updated;
            if (!full.order_items || full.order_items.length === 0) {
              const items = await fetchOrderItems(client, updated.id);
              full.order_items = items ?? full.order_items;
            }
            setOrders((prev) =>
              prev.map((order) => {
                if (order.id !== updated.id) return order;
                const fallbackItems = order.order_items;
                return {
                  ...order,
                  ...full,
                  order_items: full.order_items?.length ? full.order_items : fallbackItems,
                };
              })
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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_items" },
        async (payload) => {
          const item = payload.new as OrderItemRecord;
          const productId = item.product_id;

          let productName = productNameCache.current.get(productId);
          if (!productName) {
            const { data } = await client
              .from("products")
              .select("name")
              .eq("id", productId)
              .single();
            productName = data?.name ?? undefined;
          }
          const safeName = productName ?? productId;
          productNameCache.current.set(productId, safeName);

          setOrders((prev) =>
            prev.map((order) =>
              order.id === item.order_id
                ? {
                  ...order,
                  order_items: [
                    ...(order.order_items ?? []),
                    { ...item, products: { name: safeName } },
                  ],
                }
                : order
            )
          );
        }
      )
      .subscribe();

    return () => {
      active = false;
      channel.unsubscribe();
      if (refreshTimerRef.current) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [restaurantId]);

  useEffect(() => {
    const hasNewOrders = orders.some((order) => order.status === "enviado");
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
      a.created_at > b.created_at ? 1 : -1
    );
  }, [orders]);

  const updateStatus = async (id: string, status: OrderRecord["status"]) => {
    const client = supabase;
    if (!client) return;
    setActionStatus("");
    const servedAt = status === "entregado" ? new Date().toISOString() : null;
    const payload: Partial<OrderRecord> =
      status === "entregado" ? { status, served_at: servedAt } : { status };

    let previousOrder: OrderRecord | undefined;
    setOrders((prev) => {
      previousOrder = prev.find((order) => order.id === id);
      return prev.map((order) =>
        order.id === id
          ? { ...order, status, served_at: servedAt ?? order.served_at }
          : order
      );
    });

    let { data, error } = await client
      .from("orders")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error && /served_at/i.test(error.message || "")) {
      const retry = await client
        .from("orders")
        .update({ status })
        .eq("id", id)
        .select("*")
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      setActionStatus(
        `No se pudo actualizar el pedido: ${error.message || "error"}`
      );
      if (previousOrder) {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === id && previousOrder ? previousOrder : order
          )
        );
      }
      return;
    }

    if (data) {
      setOrders((prev) =>
        prev.map((order) =>
          order.id === id
            ? {
                ...(data as OrderRecord),
                order_items: order.order_items,
              }
            : order
        )
      );
    }
  };

  const badgeClass = (status: OrderRecord["status"]) => {
    if (status === "preparando") return "badge badge-prep";
    if (status === "listo") return "badge badge-ready";
    if (status === "entregado") return "badge badge-served";
    return "badge badge-new";
  };

  const statusLabel = (status: OrderRecord["status"]) => {
    if (status === "preparando") return "Preparando";
    if (status === "listo") return "Listo";
    if (status === "entregado") return "Entregado";
    return "Enviado";
  };

  const cardClass = (status: OrderRecord["status"]) => {
    if (status === "preparando") return "order-card status-preparing";
    if (status === "listo") return "order-card status-ready";
    if (status === "entregado") return "order-card status-served";
    return "order-card status-new";
  };

  const filtered = sortedOrders.filter((order) => {
    const okRestaurant =
      restaurantId === "all" ? true : order.restaurant_id === restaurantId;
    const okStatus =
      statusFilter === "all" ? true : order.status === statusFilter;
    return okRestaurant && okStatus;
  });

  const activeOrders = filtered.filter((order) => order.status !== "entregado");
  const servedOrders = filtered.filter((order) => order.status === "entregado");

  return (
    <AdminShell>
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
                : `Activos: ${activeOrders.length} · Servidos: ${servedOrders.length}`}
            </p>
            <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
              {/* selector de restaurante oculto para despliegue individual */}
              <label style={{ fontSize: 13, color: "#6f5b4c" }}>
                Estado
              </label>
              <select
                className="input"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as typeof statusFilter)
                }
              >
                <option value="all">Todos</option>
                <option value="enviado">Enviado</option>
                <option value="preparando">Preparando</option>
                <option value="listo">Listo</option>
                <option value="entregado">Entregado</option>
              </select>
            </div>
            <div className="admin-toolbar">
              <div className="pill">
                Última sync:{" "}
                {lastSyncAt
                  ? new Intl.DateTimeFormat("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    }).format(new Date(lastSyncAt))
                  : "—"}
              </div>
              <button
                className="btn btn-outline btn-small"
                onClick={async () => {
                  setActionStatus("");
                  const client = supabase;
                  if (!client) return;
                  try {
                    const query = client
                      .from("orders")
                      .select(
                        "*, order_items(id, order_id, product_id, quantity, note, price, products(name))"
                      )
                      .order("created_at", { ascending: true });
                    if (restaurantId !== "all") {
                      query.eq("restaurant_id", restaurantId);
                    }
                    const { data, error } = await query;
                    if (error) throw error;
                    setOrders(data as unknown as OrderRecord[]);
                    setLastSyncAt(new Date().toISOString());
                  } catch (err) {
                    setActionStatus(
                      `No se pudo refrescar: ${(err as Error).message || "error"}`
                    );
                  }
                }}
              >
                Refrescar
              </button>
            </div>
          </div>
        </section>

        {!audioReady ? (
          <p className="status-text" style={{ marginTop: 12 }}>
            Activa el sonido con un clic para alertas de pedidos nuevos.
          </p>
        ) : null}
        {actionStatus ? (
          <div
            className={`toast ${/no se pudo/i.test(actionStatus) ? "error" : ""}`}
            style={{ marginTop: 10 }}
          >
            {actionStatus}
          </div>
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
                  {buildItems(order).map((item) => {
                    const modLines = (item.modifiers ?? []).map((m) =>
                      `${m.type === "extra" ? "+" : "-"} ${m.label}`
                    );
                    const hasMods = modLines.length > 0 || Boolean(item.note);
                    return (
                      <div
                        key={item.id}
                        style={
                          hasMods
                            ? {
                                background: "rgba(255, 242, 221, 0.9)",
                                borderRadius: 10,
                                padding: "6px 8px",
                                marginBottom: 6,
                              }
                            : { marginBottom: 6 }
                        }
                      >
                        {item.qty} × {item.name}
                        {modLines.length > 0 ? ` · ${modLines.join(" · ")}` : ""}
                        {item.note ? ` · ${item.note}` : ""}
                      </div>
                    );
                  })}
                </div>

                <div className="status-text" style={{ marginTop: 8 }}>
                  Total: {formatCurrency(order.total)}
                </div>

                <div className="order-actions">
                  <button
                    className="btn btn-outline btn-small"
                    onClick={() => updateStatus(order.id, "enviado")}
                  >
                    Enviado
                  </button>
                  <button
                    className="btn btn-outline btn-small"
                    onClick={() => updateStatus(order.id, "preparando")}
                  >
                    Preparando
                  </button>
                  <button
                    className="btn btn-primary btn-small"
                    onClick={() => updateStatus(order.id, "listo")}
                  >
                    Listo
                  </button>
                  {order.status === "listo" ? (
                    <button
                      className="btn btn-outline btn-small"
                      onClick={() => updateStatus(order.id, "entregado")}
                    >
                      Entregado
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </section>
        )}

        {servedOrders.length > 0 ? (
          <section style={{ marginTop: 32 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <h3 className="section-title">Servidos</h3>
              <button
                className="btn btn-outline btn-small"
                onClick={() => setShowServed((prev) => !prev)}
              >
                {showServed
                  ? "Ocultar servidos"
                  : `Ver servidos (${servedOrders.length})`}
              </button>
            </div>
            {showServed ? (
              <div className="admin-grid">
                {servedOrders.map((order) => (
                  <div key={order.id} className={cardClass(order.status)}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
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
            ) : null}
          </section>
        ) : null}
      </main>
    </AdminShell>
  );
}
