"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../_components/AdminShell";
import { supabase } from "@/lib/supabaseClient";

type Restaurant = { id: string; name: string; slug: string };

export default function QrPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [table, setTable] = useState("");
  const [origin] = useState(() =>
    typeof window === "undefined" ? "" : window.location.origin
  );

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("restaurants")
        .select("id,name,slug")
        .order("name");
      if (error) return;
      const list = (data ?? []) as Restaurant[];
      setRestaurants(list);
      setRestaurantId((current) => current || list[0]?.id || "");
    };
    load().catch(() => undefined);
  }, []);

  const targetUrl = useMemo(() => {
    const rest = restaurants.find((r) => r.id === restaurantId);
    if (!rest || !origin) return "";
    const mesa = table.trim();
    const url = new URL(`${origin}/r/menu`);
    url.searchParams.set("restaurantId", rest.id);
    if (mesa) url.searchParams.set("table", mesa);
    return url.toString();
  }, [restaurants, restaurantId, table, origin]);

  const qrUrl = useMemo(() => {
    if (!targetUrl) return "";
    const size = 320;
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
      targetUrl
    )}`;
  }, [targetUrl]);

  return (
    <AdminShell>
      <main className="container">
        <section className="hero" style={{ alignItems: "start" }}>
          <div className="hero-card">
            <p className="badge badge-new" style={{ width: "fit-content", marginBottom: 8 }}>
              QRs por mesa
            </p>
            <h1 className="hero-title" style={{ margin: 0 }}>
              Generar QR para las mesas
            </h1>
            <p className="hero-copy" style={{ marginTop: 6 }}>
              Imprime un QR por mesa; al escanearlo se carga la mesa automáticamente en el salón.
            </p>
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              {restaurants.length > 1 ? (
                <div>
                  <label style={{ fontSize: 13, color: "#6f5b4c" }}>Restaurante</label>
                  <select
                    className="input"
                    value={restaurantId}
                    onChange={(e) => setRestaurantId(e.target.value)}
                  >
                    {restaurants.map((r, idx) => (
                      <option key={r.id} value={r.id}>
                        Restaurante {idx + 1}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="pill" style={{ width: "fit-content" }}>
                  Restaurante asignado
                </div>
              )}
              <div>
                <label style={{ fontSize: 13, color: "#6f5b4c" }}>Mesa</label>
                <input
                  className="input"
                  placeholder="Ej. 12"
                  value={table}
                  onChange={(e) => setTable(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="hero-card" style={{ minWidth: 300, textAlign: "center" }}>
            {qrUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt="QR para mesa"
                  style={{ width: 220, height: 220, objectFit: "contain", margin: "0 auto 10px" }}
                />
                <p className="status-text">
                  QR listo para mesa {table.trim() || "sin mesa"}.
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 10 }}>
                  <a className="btn btn-outline btn-small" href={qrUrl} download={`mesa-${table || "qr"}.png`}>
                    Descargar PNG
                  </a>
                  <button
                    className="btn btn-primary btn-small"
                    onClick={async () => {
                      await navigator.clipboard.writeText(targetUrl);
                    }}
                  >
                    Copiar enlace
                  </button>
                </div>
              </>
            ) : (
              <p className="status-text">Selecciona restaurante y mesa para generar el QR.</p>
            )}
          </div>
        </section>
      </main>
    </AdminShell>
  );
}
