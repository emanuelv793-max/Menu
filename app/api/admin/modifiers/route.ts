import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseService } from "@/lib/supabaseService";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const requireUser = async (request: Request) => {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  if (!token) return null;
  if (!supabaseUrl || !anonKey) return null;

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
};

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  if (!supabaseService) {
    return NextResponse.json({ message: "Falta SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
  }

  const url = new URL(request.url);
  const productId = (url.searchParams.get("productId") ?? "").trim();
  if (!productId) {
    return NextResponse.json({ message: "Falta productId." }, { status: 400 });
  }

  const { data, error } = await supabaseService
    .from("product_modifiers")
    .select("id, product_id, type, label, price")
    .eq("product_id", productId)
    .order("type")
    .order("label");

  if (error) {
    return NextResponse.json(
      { message: "No se pudieron cargar los modificadores." },
      { status: 500 }
    );
  }

  return NextResponse.json({ modifiers: data ?? [] });
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  if (!supabaseService) {
    return NextResponse.json({ message: "Falta SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
  }

  const body = (await request.json()) as {
    product_id: string;
    type: "remove" | "extra";
    label: string;
    price?: number | string;
  };

  const productId = (body.product_id ?? "").trim();
  const label = (body.label ?? "").trim();
  const type = body.type;
  const price = Number(body.price ?? 0);

  if (!productId || !label || (type !== "remove" && type !== "extra")) {
    return NextResponse.json({ message: "Datos inválidos." }, { status: 400 });
  }
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ message: "Precio inválido." }, { status: 400 });
  }

  const { data, error } = await supabaseService
    .from("product_modifiers")
    .insert([{ product_id: productId, label, type, price }])
    .select("id")
    .single();

  if (error || !data?.id) {
    return NextResponse.json(
      { message: "No se pudo crear el modificador." },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  if (!supabaseService) {
    return NextResponse.json({ message: "Falta SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
  }

  const body = (await request.json()) as {
    id: string;
    label?: string;
    type?: "remove" | "extra";
    price?: number | string;
  };

  const id = (body.id ?? "").trim();
  if (!id) return NextResponse.json({ message: "Falta id." }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof body.label === "string") update.label = body.label.trim();
  if (body.type === "remove" || body.type === "extra") update.type = body.type;
  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ message: "Precio inválido." }, { status: 400 });
    }
    update.price = price;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ message: "Nada para actualizar." }, { status: 400 });
  }

  const { error } = await supabaseService
    .from("product_modifiers")
    .update(update)
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { message: "No se pudo actualizar el modificador." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await requireUser(request);
  if (!user) return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  if (!supabaseService) {
    return NextResponse.json({ message: "Falta SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
  }

  const url = new URL(request.url);
  const id = (url.searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ message: "Falta id." }, { status: 400 });

  const { error } = await supabaseService
    .from("product_modifiers")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { message: "No se pudo eliminar el modificador." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

