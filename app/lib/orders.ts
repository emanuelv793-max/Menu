export type OrderStatus = "nuevo" | "preparando" | "listo";

export type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
};

export type Order = {
  id: string;
  table: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
};

const STORAGE_KEY = "menu-lungo-orders";
const CHANNEL_NAME = "menu-lungo-channel";

export const readOrders = (): Order[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
};

export const writeOrders = (orders: Order[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
};

export const broadcastOrders = (orders: Order[]) => {
  if (typeof window === "undefined") return;
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage({ type: "orders", orders });
  channel.close();
};

export const subscribeToOrders = (handler: (orders: Order[]) => void) => {
  if (typeof window === "undefined") return () => undefined;

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        handler(JSON.parse(event.newValue) as Order[]);
      } catch {
        return;
      }
    }
  };

  window.addEventListener("storage", onStorage);

  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => {
      if (event?.data?.type === "orders") {
        handler(event.data.orders as Order[]);
      }
    };
  }

  return () => {
    window.removeEventListener("storage", onStorage);
    if (channel) channel.close();
  };
};
