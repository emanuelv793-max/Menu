"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

const MENU = [
  // Pane e pierina
  {
    id: "ent-1",
    name: "Surtido de focaccias",
    description: "Aceite, cebolla, aceitunas y tomate.",
    price: 4.85,
    category: "Entrantes",
  },
  {
    id: "ent-2",
    name: "Pierina Parmigiana",
    description: "Base de pizza con queso parmigiano.",
    price: 5.15,
    category: "Entrantes",
  },
  {
    id: "ent-3",
    name: "Pierina Tartufata",
    description: "Base de pizza con trufa negra.",
    price: 5.55,
    category: "Entrantes",
  },
  // Entrantes fríos/calientes
  {
    id: "ent-4",
    name: "Croquetas de la abuela",
    description: "Jamón ibérico y pollo asado (8 uds).",
    price: 11.85,
    category: "Entrantes",
  },
  {
    id: "ent-5",
    name: "Carpaccio de ternera",
    description: "Solomillo, limón, AOVE y parmigiano 24M.",
    price: 17.75,
    category: "Entrantes",
  },
  {
    id: "ent-6",
    name: "Burrata della Puglia",
    description: "Mermelada de tomate, pesto, rúcula y piñones.",
    price: 14.55,
    category: "Entrantes",
  },
  // Ensaladas
  {
    id: "ens-1",
    name: "Giulietta",
    description: "Lechugas, tomate, cecina, beicon y rulo de cabra.",
    price: 14.55,
    category: "Ensaladas",
  },
  {
    id: "ens-2",
    name: "Paese",
    description: "Lechugas, pistachos, rulo de cabra, manzana y nueces.",
    price: 14.55,
    category: "Ensaladas",
  },
  {
    id: "ens-3",
    name: "Pollo crocante",
    description: "Lechugas, pollo crujiente, pimiento asado y aguacate.",
    price: 14.55,
    category: "Ensaladas",
  },
  // Gratinados
  {
    id: "gra-1",
    name: "Gran cannelloni",
    description: "Asado tradicional, bechamel y parmigiano.",
    price: 18.6,
    category: "Gratinados",
  },
  {
    id: "gra-2",
    name: "Cannelloni di mare",
    description: "Brandada de bacalao y gambas, bechamel de piquillo.",
    price: 18.1,
    category: "Gratinados",
  },
  {
    id: "gra-3",
    name: "Lasagna a la Bolognese",
    description: "Cinco láminas con boloñesa, bechamel y parmigiano.",
    price: 18.95,
    category: "Gratinados",
  },
  // Pizzas clásicas
  {
    id: "piz-1",
    name: "Prosciutto",
    description: "Tomate, mozzarella y jamón de York.",
    price: 16.35,
    category: "Pizzas",
  },
  {
    id: "piz-2",
    name: "Pepperoni",
    description: "Tomate, mozzarella, pepperoni y beicon crujiente.",
    price: 16.55,
    category: "Pizzas",
  },
  {
    id: "piz-3",
    name: "Quattro stagioni",
    description: "Tomate, mozzarella, jamón, champiñones, atún y alcachofas.",
    price: 16.75,
    category: "Pizzas",
  },
  // Pizzas especiales
  {
    id: "piz-4",
    name: "Piemontesa",
    description: "Tomate, burrata, carpaccio y rúcula.",
    price: 17.05,
    category: "Pizzas",
  },
  {
    id: "piz-5",
    name: "Parmigiana",
    description: "Tomate, mozzarella, beicon, scamorza y parmigiano.",
    price: 16.75,
    category: "Pizzas",
  },
  {
    id: "piz-6",
    name: "Diavola",
    description: "Base de ternera, pepperoni, longaniza y guindilla.",
    price: 16.75,
    category: "Pizzas",
  },
  // Pastas (selección)
  {
    id: "pas-1",
    name: "Tagliatelle Ligurian",
    description: "Pesto a la crema con beicon y parmigiano.",
    price: 14.6,
    category: "Pastas",
  },
  {
    id: "pas-2",
    name: "Tagliatelle Trufa y hongos",
    description: "Crema de funghi porcini y trufa con setas.",
    price: 14.6,
    category: "Pastas",
  },
  {
    id: "pas-3",
    name: "Tagliatelle Carbonara",
    description: "Carbonara clásica “al mio modo”.",
    price: 14.6,
    category: "Pastas",
  },
  // Carnes
  {
    id: "car-1",
    name: "Pollo al horno",
    description: "Medio pollo en su jugo, patatas fritas y salsa mesone.",
    price: 17.35,
    category: "Carnes",
  },
  {
    id: "car-2",
    name: "Maxi burguer Angus",
    description: "Foie, beicon, scamorza y cebolla caramelizada.",
    price: 20.05,
    category: "Carnes",
  },
  {
    id: "car-3",
    name: "Entrecot Angus (parrilla)",
    description: "Con guarnición; opción salsas aparte.",
    price: 25.05,
    category: "Carnes",
  },
  // Bebidas (vinos y sangrías)
  {
    id: "beb-1",
    name: "Lambrusco Rosso",
    description: "IGT Reggio Emilia · espumoso tinto.",
    price: 13.95,
    category: "Bebidas",
  },
  {
    id: "beb-2",
    name: "Copa de vino de la casa",
    description: "Tinto, rosado o blanco.",
    price: 3.25,
    category: "Bebidas",
  },
  {
    id: "beb-3",
    name: "Sangría de vino (1L)",
    description: "Receta de la casa.",
    price: 16.95,
    category: "Bebidas",
  },
];

const CATEGORIES = [
  "Entrantes",
  "Ensaladas",
  "Gratinados",
  "Pizzas",
  "Pastas",
  "Carnes",
  "Bebidas",
] as const;

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
