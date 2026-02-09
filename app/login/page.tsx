"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { hasSupabaseConfig, supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/admin");
      }
    };

    checkSession();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    if (!supabase) {
      setError("Faltan variables de entorno de Supabase.");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Credenciales inválidas o usuario no autorizado.");
      setLoading(false);
      return;
    }

    router.replace("/admin");
  };

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
            <div className="brand-sub">Acceso cocina</div>
          </div>
          <Link className="nav-link" href="/">
            Volver al salón
          </Link>
        </div>
      </header>

      <main className="container">
        {!hasSupabaseConfig ? (
          <div className="hero-card" style={{ marginBottom: 16, maxWidth: 520 }}>
            <h2 className="section-title">Configura Supabase</h2>
            <p className="hero-copy">
              Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en
              <strong> .env.local</strong> para habilitar el login.
            </p>
          </div>
        ) : null}
        <section className="hero">
          <div className="hero-card" style={{ maxWidth: 420 }}>
            <h1 className="hero-title">Iniciar sesión</h1>
            <p className="hero-copy">
              Acceso exclusivo para el equipo de cocina.
            </p>
            <form className="table-input" onSubmit={handleSubmit}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                placeholder="cocina@menu-lungo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              {error ? <p className="status-text">{error}</p> : null}
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Verificando..." : "Entrar"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
