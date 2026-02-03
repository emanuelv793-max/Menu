"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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

  if (!hasSupabaseConfig) {
    return (
      <div className="page">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="brand">
              <div className="brand-mark">Menu Lungo</div>
              <div className="brand-sub">Panel</div>
            </div>
          </div>
        </header>
        <main className="container">
          <p className="status-text">
            Configura Supabase en <strong>.env.local</strong> para usar el panel.
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
              <div className="brand-sub">Panel</div>
            </div>
          </div>
        </header>
        <main className="container">
          <p className="status-text">Verificando acceso...</p>
        </main>
      </div>
    );
  }

  const isKitchen = pathname === "/admin";
  const isProducts = pathname?.startsWith("/admin/products");

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <div className="brand-mark">Menu Lungo</div>
            <div className="brand-sub">Panel</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link
              className={`nav-link ${isKitchen ? "active" : ""}`}
              href="/admin"
              aria-current={isKitchen ? "page" : undefined}
            >
              Cocina
            </Link>
            <Link
              className={`nav-link ${isProducts ? "active" : ""}`}
              href="/admin/products"
              aria-current={isProducts ? "page" : undefined}
            >
              Productos
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
      {children}
    </div>
  );
}

