"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { SupabaseClient } from "@supabase/supabase-js";
import AdminShell from "./_components/AdminShell";

type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  note?: string | null;
  modifiers?: { label: string; type: "remove" | "extra"; price?: number }[];
};

type OrderItemRecord = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  note: string | null;
  price: number;
  products?: { name: string | null } | null;
  order_item_modifiers?: { label: string; type: "remove" | "extra"; price?: number }[] | null;
};

type OrderItemModifierRecord = {
  order_item_id: string;
  label: string;
  type: "remove" | "extra";
  price: number;
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

type RestaurantScope = {
  id: string;
  slug: string;
};

const DEFAULT_RESTAURANT_SLUG =
  process.env.NEXT_PUBLIC_DEFAULT_RESTAURANT_SLUG ?? "domus";
const AUTO_REFRESH_MS = 4_000;

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
  const [statusFilter, setStatusFilter] = useState<
    "all" | "enviado" | "preparando" | "listo" | "entregado"
  >("all");
  const beepIntervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastBeepRef = useRef(0);
  const productNameCache = useRef<Map<string, string>>(new Map());
  const refreshTimerRef = useRef<number | null>(null);
  const restaurantScopeIdRef = useRef<string | null | undefined>(undefined);
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
        price: m.price,
      })),
    })) ?? []
  );
};

  const fetchOrderItems = useCallback(async (db: SupabaseClient, orderId: string) => {
    const { data } = await db
      .from("order_items")
      .select("id, order_id, product_id, quantity, note, price, products(name)")
      .eq("order_id", orderId);
    return data as OrderItemRecord[] | null;
  }, []);

  const fetchOrderItemModifiers = useCallback(
    async (db: SupabaseClient, orderItemIds: string[]) => {
      if (orderItemIds.length === 0) return [] as OrderItemModifierRecord[];
      const { data, error } = await db
        .from("order_item_modifiers")
        .select("order_item_id, label, type, price")
        .in("order_item_id", orderItemIds);
      if (error || !data) return [] as OrderItemModifierRecord[];
      return data as OrderItemModifierRecord[];
    },
    []
  );

  const attachModifiersToOrders = useCallback(
    async (db: SupabaseClient, inputOrders: OrderRecord[]) => {
      const orderItems = inputOrders.flatMap((order) => order.order_items ?? []);
      const itemIds = orderItems.map((item) => item.id);
      const modifiers = await fetchOrderItemModifiers(db, itemIds);
      if (modifiers.length === 0) return inputOrders;

      const modifiersByItem = new Map<string, OrderItemModifierRecord[]>();
      modifiers.forEach((modifier) => {
        const current = modifiersByItem.get(modifier.order_item_id) ?? [];
        current.push(modifier);
        modifiersByItem.set(modifier.order_item_id, current);
      });

      return inputOrders.map((order) => ({
        ...order,
        order_items: (order.order_items ?? []).map((item) => ({
          ...item,
          order_item_modifiers: (modifiersByItem.get(item.id) ?? []).map((m) => ({
            label: m.label,
            type: m.type,
            price: m.price,
          })),
        })),
      }));
    },
    [fetchOrderItemModifiers]
  );

  const fetchOrderWithItems = useCallback(
    async (db: SupabaseClient, id: string): Promise<OrderRecord | null> => {
      const { data } = await db
        .from("orders")
        .select("*, order_items(id, order_id, product_id, quantity, note, price, products(name))")
        .eq("id", id)
        .single();
      const order = (data as OrderRecord) ?? null;
      if (!order) return null;
      const [withModifiers] = await attachModifiersToOrders(db, [order]);
      return withModifiers ?? order;
    },
    [attachModifiersToOrders]
  );

  const resolveRestaurantScopeId = useCallback(async (db: SupabaseClient) => {
    const { data, error } = await db
      .from("restaurants")
      .select("id,slug")
      .order("name");
    if (error || !data || data.length === 0) return null;
    const list = data as RestaurantScope[];
    const preferred = list.find((r) => r.slug === DEFAULT_RESTAURANT_SLUG);
    return preferred?.id ?? list[0].id;
  }, []);

  const loadData = useCallback(async () => {
    const client = supabase;
    if (!client) return;

    if (restaurantScopeIdRef.current === undefined) {
      restaurantScopeIdRef.current = await resolveRestaurantScopeId(client);
    }

    const scopeId = restaurantScopeIdRef.current ?? null;
    let query = client
      .from("orders")
      .select("*, order_items(id, order_id, product_id, quantity, note, price, products(name))")
      .order("created_at", { ascending: true });

    if (scopeId) {
      query = query.eq("restaurant_id", scopeId);
    }

    const { data: ordersData, error: ordersError } = await query;
    if (ordersError) throw ordersError;

    const enrichedOrders = await Promise.all(
      ((ordersData ?? []) as OrderRecord[]).map(async (order) => {
        const items =
          order.order_items && order.order_items.length > 0
            ? order.order_items
            : await fetchOrderItems(client, order.id);
        return { ...order, order_items: items ?? order.order_items };
      })
    );
    const withModifiers = await attachModifiersToOrders(client, enrichedOrders);
    setOrders(withModifiers);
    setLastSyncAt(new Date().toISOString());
  }, [attachModifiersToOrders, fetchOrderItems, resolveRestaurantScopeId]);

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

    const safeLoad = async () => {
      try {
        await loadData();
        if (active) setActionStatus("");
      } catch (err) {
        if (!active) return;
        setActionStatus(`No se pudo refrescar: ${(err as Error).message || "error"}`);
      }
    };

    const onVisibleOrFocus = () => {
      if (document.visibilityState !== "visible") return;
      safeLoad().catch(() => undefined);
    };

    const isOutOfScope = (restaurantId?: string | null) => {
      const scopeId = restaurantScopeIdRef.current;
      if (!scopeId) return false;
      return restaurantId !== scopeId;
    };

    safeLoad().catch(() => undefined);
    refreshTimerRef.current = window.setInterval(() => {
      safeLoad().catch(() => undefined);
    }, AUTO_REFRESH_MS);
    document.addEventListener("visibilitychange", onVisibleOrFocus);
    window.addEventListener("focus", onVisibleOrFocus);

    const channel = client
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const inserted = payload.new as { id: string; restaurant_id?: string };
            if (isOutOfScope(inserted.restaurant_id)) return;
            const fullOrder =
              (await fetchOrderWithItems(client, inserted.id)) ||
              ((payload.new as OrderRecord) ?? null);
            if (!fullOrder) return;
            setOrders((prev) => [
              ...prev.filter((order) => order.id !== fullOrder.id),
              fullOrder,
            ]);
            setLastSyncAt(new Date().toISOString());
          }
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as OrderRecord;
            if (isOutOfScope(updated.restaurant_id)) {
              setOrders((prev) => prev.filter((order) => order.id !== updated.id));
              return;
            }
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
            setLastSyncAt(new Date().toISOString());
          }
          if (payload.eventType === "DELETE") {
            const removed = payload.old as OrderRecord;
            if (isOutOfScope(removed.restaurant_id)) return;
            setOrders((prev) =>
              prev.filter((order) => order.id !== removed.id)
            );
            setLastSyncAt(new Date().toISOString());
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
                      {
                        ...item,
                        products: { name: safeName },
                        order_item_modifiers: [],
                      },
                    ],
                  }
                : order
            )
          );
          setLastSyncAt(new Date().toISOString());
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_item_modifiers" },
        (payload) => {
          const modifier = payload.new as OrderItemModifierRecord;
          setOrders((prev) =>
            prev.map((order) => ({
              ...order,
              order_items: (order.order_items ?? []).map((item) =>
                item.id !== modifier.order_item_id
                  ? item
                  : {
                      ...item,
                      order_item_modifiers: [
                        ...(item.order_item_modifiers ?? []),
                        { label: modifier.label, type: modifier.type, price: modifier.price },
                      ],
                    }
              ),
            }))
          );
          setLastSyncAt(new Date().toISOString());
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
      document.removeEventListener("visibilitychange", onVisibleOrFocus);
      window.removeEventListener("focus", onVisibleOrFocus);
    };
  }, [fetchOrderItems, fetchOrderWithItems, loadData]);

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

  const filtered = sortedOrders.filter((order) =>
    statusFilter === "all" ? true : order.status === statusFilter
  );

  const activeOrders = filtered.filter((order) => order.status !== "entregado");
  const servedOrders = filtered.filter((order) => order.status === "entregado");

  return (
    <AdminShell>
      <main className="container">
        <section className="hero" style={{ gap: 14 }}>
          <div className="hero-card" style={{ flex: "1 1 320px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <p className="badge badge-new" style={{ marginBottom: 6 }}>Cocina</p>
                <h1 className="hero-title" style={{ margin: 0 }}>Pedidos en tiempo real</h1>
              </div>
              <div className="pill">
                {audioReady ? "Sonido listo" : "Activa sonido"}
              </div>
            </div>
            <p className="hero-copy" style={{ marginTop: 6 }}>
              Gestiona los tickets en cola y cambia el estado en un solo clic.
            </p>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", marginTop: 12 }}>
              <div className="pill" style={{ background: "rgba(255,132,0,0.08)" }}>
                Activos: <strong>{activeOrders.length}</strong>
              </div>
              <div className="pill" style={{ background: "rgba(34,197,94,0.08)" }}>
                Servidos hoy: <strong>{servedOrders.length}</strong>
              </div>
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
            </div>
          </div>

          <div className="hero-card" style={{ flex: "1 1 320px" }}>
            <h3 className="section-title" style={{ marginTop: 0 }}>Filtros rápidos</h3>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <label style={{ fontSize: 13, color: "#6f5b4c" }}>Estado</label>
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
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  className="btn btn-outline btn-small"
                  onClick={async () => {
                    setActionStatus("");
                    try {
                      await loadData();
                    } catch (err) {
                      setActionStatus(
                        `No se pudo refrescar: ${(err as Error).message || "error"}`
                      );
                    }
                  }}
                >
                  Refrescar
                </button>
                <div className="status-text">
                  Tiempo real activado (cada 4s)
                </div>
              </div>
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
                    const modLines = (item.modifiers ?? []).map((m) => {
                      const priceTag = m.price ? ` (${formatCurrency(m.price)})` : "";
                      return `${m.type === "extra" ? "+" : "-"} ${m.label}${priceTag}`;
                    });
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
