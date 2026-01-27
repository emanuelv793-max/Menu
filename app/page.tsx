"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

const MENU = [
  {
    id: "ent-1",
    name: "Bruschetta del horno",
    description: "Tomate asado, albahaca y aceite cítrico.",
    price: 5.5,
    category: "Entrantes",
  },
  {
    id: "ent-2",
    name: "Arancini de trufa",
    description: "Risotto crujiente con queso pecorino.",
    price: 6.2,
    category: "Entrantes",
  },
  {
    id: "ent-3",
    name: "Caprese tibia",
    description: "Mozzarella fresca, pesto de pistacho.",
    price: 6.8,
    category: "Entrantes",
  },
  {
    id: "piz-1",
    name: "Margherita intensa",
    description: "San Marzano, fior di latte, albahaca.",
    price: 11.5,
    category: "Pizzas",
  },
  {
    id: "piz-2",
    name: "Diavola dorada",
    description: "Salami picante, miel de ají, provolone.",
    price: 13.4,
    category: "Pizzas",
  },
  {
    id: "piz-3",
    name: "Bosco e funghi",
    description: "Setas mixtas, romero, crema ligera.",
    price: 12.9,
    category: "Pizzas",
  },
  {
    id: "beb-1",
    name: "Spritz Lungo",
    description: "Aperol, prosecco y soda cítrica.",
    price: 7.5,
    category: "Bebidas",
  },
  {
    id: "beb-2",
    name: "Limonata fresca",
    description: "Limón, menta y jarabe artesanal.",
    price: 4.2,
    category: "Bebidas",
  },
  {
    id: "beb-3",
    name: "Té negro frío",
    description: "Infusión especiada con toque de naranja.",
    price: 3.8,
    category: "Bebidas",
  },
  {
    id: "pos-1",
    name: "Tiramisú clásico",
    description: "Café espresso, cacao y mascarpone.",
    price: 6.4,
    category: "Postres",
  },
  {
    id: "pos-2",
    name: "Panna cotta",
    description: "Vainilla de Madagascar y frutos rojos.",
    price: 5.9,
    category: "Postres",
  },
  {
    id: "pos-3",
    name: "Gelato doble",
    description: "Elige dos sabores artesanales.",
    price: 4.9,
    category: "Postres",
  },
];

const CATEGORIES = ["Entrantes", "Pizzas", "Bebidas", "Postres"] as const;

type CartLine = {
  id: string;
  qty: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(value);

export default function Home() {
  const [table, setTable] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(
    CATEGORIES[0]
  );
  const [cart, setCart] = useState<CartLine[]>([]);
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  const menuById = useMemo(
    () => new Map(MENU.map((item) => [item.id, item])),
    []
  );

  const visibleMenu = useMemo(
    () => MENU.filter((item) => item.category === selectedCategory),
    [selectedCategory]
  );

  const cartItems = useMemo(() => {
    const items = cart.map((line) => {
      const item = menuById.get(line.id);
      if (!item) return null;
      return {
        ...item,
        qty: line.qty,
        lineTotal: item.price * line.qty,
      };
    });

    return items.filter(
      (item): item is Exclude<(typeof items)[number], null> => item !== null
    );
  }, [cart, menuById]);

  const total = useMemo(
    () => cartItems.reduce((acc, item) => acc + item.lineTotal, 0),
    [cartItems]
  );

  const addToCart = (id: string) => {
    setCart((prev) => {
      const existing = prev.find((line) => line.id === id);
      if (existing) {
        return prev.map((line) =>
          line.id === id ? { ...line, qty: line.qty + 1 } : line
        );
      }
      return [...prev, { id, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((line) =>
          line.id === id ? { ...line, qty: line.qty + delta } : line
        )
        .filter((line) => line.qty > 0);
    });
  };

  const sendOrder = async () => {
    if (!table.trim()) {
      setStatus("Ingresa tu número de mesa para enviar el pedido.");
      return;
    }
    if (cartItems.length === 0) {
      setStatus("Agrega al menos un plato al carrito.");
      return;
    }
    if (!supabase) {
      setStatus(
        "Configura Supabase (.env.local) para enviar pedidos en tiempo real."
      );
      return;
    }

    const items = cartItems.map((item) => ({
      id: item.id,
      name: item.name,
      qty: item.qty,
      price: item.price,
    }));
    setSending(true);
    const { error } = await supabase.from("orders").insert([
      {
        table_number: table.trim(),
        items,
        total,
        status: "new",
      },
    ]);

    if (error) {
      setStatus("No se pudo enviar el pedido. Intenta nuevamente.");
      setSending(false);
      return;
    }

    setCart([]);
    setStatus("Pedido enviado. ¡En cocina ya lo están preparando!");
    setSending(false);
  };

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark">Menu Lungo</div>
            <div className="brand-sub">Cucina contemporánea</div>
          </div>
          <Link className="nav-link" href="/admin">
            Abrir cocina
          </Link>
        </div>
      </header>

      <main className="container">
        {!hasSupabaseConfig ? (
          <div className="hero-card" style={{ marginBottom: 24 }}>
            <h2 className="section-title">Configurar Supabase</h2>
            <p className="hero-copy">
              Falta configurar las variables NEXT_PUBLIC_SUPABASE_URL y
              NEXT_PUBLIC_SUPABASE_ANON_KEY en <strong>.env.local</strong>.
            </p>
          </div>
        ) : null}
        <section className="hero">
          <div className="hero-card">
            <h1 className="hero-title">Haz tu pedido desde la mesa</h1>
            <p className="hero-copy">
              Selecciona tu número de mesa y explora el menú del día. Tu pedido
              llegará directo a la cocina en segundos.
            </p>
            <div className="table-input">
              <label htmlFor="table">Número de mesa</label>
              <input
                id="table"
                className="input"
                placeholder="Ej. 12"
                value={table}
                onChange={(event) => setTable(event.target.value)}
              />
            </div>
          </div>
          <div className="hero-card">
            <h2 className="section-title">Especial de la casa</h2>
            <p className="hero-copy">
              Pizza Diavola dorada + Spritz Lungo + Tiramisú clásico.
            </p>
            <div style={{ marginTop: 18 }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  addToCart("piz-2");
                  addToCart("beb-1");
                  addToCart("pos-1");
                }}
              >
                Agregar combo
              </button>
            </div>
          </div>
        </section>

        <section className="layout">
          <div>
            <h3 className="section-title">Categorías</h3>
            <div className="category-row">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  className={`category-button ${
                    selectedCategory === category ? "active" : ""
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="menu-grid">
              {visibleMenu.map((item) => (
                <div key={item.id} className="menu-card">
                  <h4>{item.name}</h4>
                  <p>{item.description}</p>
                  <div className="menu-price">{formatCurrency(item.price)}</div>
                  <button
                    className="btn btn-outline btn-small"
                    onClick={() => addToCart(item.id)}
                  >
                    Agregar al carrito
                  </button>
                </div>
              ))}
            </div>
          </div>

          <aside className="cart">
            <h3 className="section-title">Tu carrito</h3>
            {cartItems.length === 0 ? (
              <p className="status-text">Aún no hay productos seleccionados.</p>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} className="cart-item">
                  <div>
                    <strong>{item.name}</strong>
                    <div className="status-text">
                      {formatCurrency(item.price)} · {item.qty} uds.
                    </div>
                  </div>
                  <div className="cart-controls">
                    <button
                      className="btn btn-outline btn-small"
                      onClick={() => updateQty(item.id, -1)}
                    >
                      -
                    </button>
                    <span>{item.qty}</span>
                    <button
                      className="btn btn-outline btn-small"
                      onClick={() => updateQty(item.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}

            <div className="cart-item">
              <div>
                <strong>Total</strong>
              </div>
              <div className="menu-price">{formatCurrency(total)}</div>
            </div>

            <button
              className="btn btn-primary"
              onClick={sendOrder}
              disabled={sending}
            >
              {sending ? "Enviando..." : "Enviar pedido"}
            </button>
            {status ? <p className="status-text">{status}</p> : null}
          </aside>
        </section>
      </main>
    </div>
  );
}
