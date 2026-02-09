"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);
  const [userRole, setUserRole] = useState<"admin" | "staff" | "none">("none");
  const [globalError, setGlobalError] = useState<string | null>(null);
  const lastErrorRef = useRef<string>("");
  const clearTimerRef = useRef<number | null>(null);

  const reportError = useCallback((message: string, detail?: string) => {
    if (!message) return;
    if (message === lastErrorRef.current) return;
    lastErrorRef.current = message;
    setGlobalError(message);
    if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    clearTimerRef.current = window.setTimeout(() => setGlobalError(null), 6000);

    fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        source: "admin-ui",
        level: "error",
        message,
        detail,
        url: typeof window === "undefined" ? "" : window.location.href,
      }),
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      const { data: roleRow, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.session.user.id)
        .maybeSingle();
      if (roleError) {
        reportError("No se pudo cargar el rol del usuario.", roleError.message);
        if (mounted) setUserRole("none");
      } else {
        const role = roleRow?.role === "admin" ? "admin" : roleRow?.role === "staff" ? "staff" : "none";
        if (mounted) setUserRole(role);
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
  }, [reportError, router]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reportError(event.message || "Error no controlado", event.error?.stack);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason =
        typeof event.reason === "string"
          ? event.reason
          : event.reason?.message || "Promesa rechazada";
      reportError(reason, event.reason?.stack);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    };
  }, [reportError]);

  const isKitchen = pathname === "/admin";
  const isProducts = pathname?.startsWith("/admin/products");
  const isQr = pathname?.startsWith("/admin/qr");
  const isCashier = pathname?.startsWith("/admin/cashier");
  const isMetrics = pathname?.startsWith("/admin/metrics");
  const isStaffOnly = userRole === "staff";
  const isAdminOnlyRoute = isProducts || isQr || isMetrics;

  useEffect(() => {
    if (!authChecked) return;
    if (userRole === "none") return;
    if (isStaffOnly && isAdminOnlyRoute) {
      router.replace("/admin");
    }
  }, [authChecked, isAdminOnlyRoute, isStaffOnly, router, userRole]);

  if (!hasSupabaseConfig) {
    return (
      <div className="page">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="brand">
              <img
                className="brand-logo"
                src="/brand/domus-logo-horizontal.svg"
                alt="Domus"
              />
              <img
                className="brand-icon brand-icon-default"
                src="/brand/domus-icon.svg"
                alt="Domus"
              />
              <img
                className="brand-icon brand-icon-dark"
                src="/brand/domus-icon-dark.svg"
                alt="Domus"
              />
              <img
                className="brand-icon brand-icon-light"
                src="/brand/domus-icon-light.svg"
                alt="Domus"
              />
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
              <img
                className="brand-logo"
                src="/brand/domus-logo-horizontal.svg"
                alt="Domus"
              />
              <img
                className="brand-icon brand-icon-default"
                src="/brand/domus-icon.svg"
                alt="Domus"
              />
              <img
                className="brand-icon brand-icon-dark"
                src="/brand/domus-icon-dark.svg"
                alt="Domus"
              />
              <img
                className="brand-icon brand-icon-light"
                src="/brand/domus-icon-light.svg"
                alt="Domus"
              />
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

  return (
    <div className="page">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <img
              className="brand-logo"
              src="/brand/domus-logo-horizontal.svg"
              alt="Domus"
            />
            <img
              className="brand-icon brand-icon-default"
              src="/brand/domus-icon.svg"
              alt="Domus"
            />
            <img
              className="brand-icon brand-icon-dark"
              src="/brand/domus-icon-dark.svg"
              alt="Domus"
            />
            <img
              className="brand-icon brand-icon-light"
              src="/brand/domus-icon-light.svg"
              alt="Domus"
            />
            <div className="brand-sub">Panel</div>
          </div>
          <div className="topbar-nav">
            <Link
              className={`nav-link ${isKitchen ? "active" : ""}`}
              href="/admin"
              aria-current={isKitchen ? "page" : undefined}
            >
              Cocina
            </Link>
            {!isStaffOnly ? (
              <Link
                className={`nav-link ${isProducts ? "active" : ""}`}
                href="/admin/products"
                aria-current={isProducts ? "page" : undefined}
              >
                Productos
              </Link>
            ) : null}
            {!isStaffOnly ? (
              <Link
                className={`nav-link ${isQr ? "active" : ""}`}
                href="/admin/qr"
                aria-current={isQr ? "page" : undefined}
              >
                QRs
              </Link>
            ) : null}
            <Link
              className={`nav-link ${isCashier ? "active" : ""}`}
              href="/admin/cashier"
              aria-current={isCashier ? "page" : undefined}
            >
              Caja
            </Link>
            {!isStaffOnly ? (
              <Link
                className={`nav-link ${isMetrics ? "active" : ""}`}
                href="/admin/metrics"
                aria-current={isMetrics ? "page" : undefined}
              >
                Datos
              </Link>
            ) : null}
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
      {globalError ? (
        <div className="container">
          <div className="toast error" role="status" style={{ marginTop: 12 }}>
            {globalError}
          </div>
        </div>
      ) : null}
      {userRole === "none" ? (
        <main className="container">
          <div className="hero-card" style={{ marginTop: 24 }}>
            <h2 className="section-title">Rol no asignado</h2>
            <p className="status-text">
              Este usuario no tiene un rol asignado. Contacta a un administrador.
            </p>
          </div>
        </main>
      ) : (
        children
      )}
    </div>
  );
}
