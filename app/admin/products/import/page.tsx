"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "../../_components/AdminShell";
import { supabase } from "@/lib/supabaseClient";

type Restaurant = { id: string; name: string; slug: string };

type ImportResult = { created: number; updated: number; total: number };

export default function ProductsImportPage() {
  const [token, setToken] = useState("");
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [slug, setSlug] = useState("domus");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [message, setMessage] = useState("");

  const fetchAdmin = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!token) throw new Error("Sesión inválida. Vuelve a iniciar sesión.");
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };

  useEffect(() => {
    let mounted = true;
    const loadSession = async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token ?? "";
      if (mounted) setToken(accessToken);
    };
    loadSession();
    const { data: listener } = supabase
      ? supabase.auth.onAuthStateChange((_event, session) => {
          setToken(session?.access_token ?? "");
        })
      : { data: undefined };
    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const loadRestaurants = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("restaurants")
        .select("id,name,slug")
        .order("name", { ascending: true });
      if (error) {
        setMessage("No se pudieron cargar los restaurantes.");
        return;
      }
      const list = (data ?? []) as Restaurant[];
      setRestaurants(list);
      const preferred = list.find((r) => r.slug === "domus");
      if (preferred) {
        setRestaurantId(preferred.id);
        setSlug(preferred.slug);
      } else if (list.length > 0) {
        setRestaurantId(list[0].id);
        setSlug(list[0].slug);
      }
    };
    loadRestaurants().catch(() => undefined);
  }, []);

  const runImport = async () => {
    if (!restaurantId) {
      setMessage("Selecciona un restaurante.");
      return;
    }
    setLoading(true);
    setMessage("");
    setResult(null);
    try {
      const res = await fetchAdmin("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId, slug }),
      });
      const payload = (await res.json()) as { message?: string } & ImportResult;
      if (!res.ok) throw new Error(payload.message || "No se pudo importar.");
      setResult({ created: payload.created, updated: payload.updated, total: payload.total });
      setMessage("Importación completa.");
    } catch (err) {
      setMessage((err as Error).message || "Error en la importación.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminShell>
      <main className="container">
        <section className="hero" style={{ alignItems: "start" }}>
          <div className="hero-card">
            <h1 className="hero-title">Importar menú PDF</h1>
            <p className="hero-copy">
              Carga todos los productos de MenuCarta.pdf en la base de datos sin duplicados.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link className="btn btn-outline btn-small" href="/admin/products">
                Volver al listado
              </Link>
            </div>
          </div>

          <div className="hero-card" style={{ minWidth: 320 }}>
            <div className="table-input" style={{ marginBottom: 12 }}>
              <label>Restaurante</label>
              <select
                className="input"
                value={restaurantId}
                onChange={(e) => {
                  const next = e.target.value;
                  setRestaurantId(next);
                  const found = restaurants.find((r) => r.id === next);
                  if (found) setSlug(found.slug);
                }}
              >
                <option value="">Selecciona uno</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.slug})
                  </option>
                ))}
              </select>
            </div>

            <button className="btn btn-primary" onClick={runImport} disabled={loading || !restaurantId}>
              {loading ? "Importando..." : "Importar MenuCarta.pdf"}
            </button>

            {message ? (
              <p className="status-text" style={{ marginTop: 10 }}>
                {message}
              </p>
            ) : null}
            {result ? (
              <div className="pill" style={{ marginTop: 10 }}>
                {result.created} productos creados, {result.updated} actualizados (total {result.total})
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </AdminShell>
  );
}
