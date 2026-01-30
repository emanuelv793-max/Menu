import { supabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";

export default async function Home() {
  const supabase = supabaseServer();
  const { data } = await supabase
    .from("restaurants")
    .select("name, slug, logo_url")
    .order("name", { ascending: true });

  return (
    <div className="page">
      <main className="container" style={{ paddingTop: 48 }}>
        <h1 className="hero-title">Selecciona restaurante</h1>
        <div className="menu-grid">
          {(data ?? []).map((r) => (
            <Link key={r.slug} href={`/r/${r.slug}`} className="menu-card">
              <div className="menu-body">
                <h4>{r.name}</h4>
                <p className="menu-desc">Entrar al menú</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
