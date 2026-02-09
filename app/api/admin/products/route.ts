import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseService } from "@/lib/supabaseService";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

type OptionInput =
  | string
  | {
      label?: string | null;
      price?: number | string | null;
    };

type OptionValue = {
  label: string;
  price: number;
};

const normalizeOptions = (raw?: OptionInput[] | null): OptionValue[] => {
  const entries = Array.isArray(raw) ? raw : [];
  const map = new Map<string, OptionValue>();
  for (const entry of entries) {
    if (typeof entry === "string") {
      const label = entry.trim();
      if (!label) continue;
      map.set(label, { label, price: 0 });
      continue;
    }
    if (entry && typeof entry === "object") {
      const label = String(entry.label ?? "").trim();
      if (!label) continue;
      const price = Number(entry.price ?? 0);
      const safePrice = Number.isFinite(price) && price >= 0 ? price : 0;
      map.set(label, { label, price: safePrice });
    }
  }
  return Array.from(map.values());
};

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
  if (!user) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }
  if (!supabaseService) {
    return NextResponse.json(
      { message: "Falta SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const restaurantId = url.searchParams.get("restaurantId") ?? "";
  const q = (url.searchParams.get("q") ?? "").trim();
  const category = (url.searchParams.get("category") ?? "").trim();

  let query = supabaseService
    .from("products")
    .select(
      "id, restaurant_id, name, description, price, image_url, category, extras, excludes, is_active, created_at"
    )
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (restaurantId) query = query.eq("restaurant_id", restaurantId);
  if (q) query = query.ilike("name", `%${q}%`);
  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) {
    console.error("[admin/products GET]", error);
    return NextResponse.json(
      { message: "No se pudieron cargar los productos." },
      { status: 500 }
    );
  }

  return NextResponse.json({ products: data ?? [] });
}

export async function POST(request: Request) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }
  if (!supabaseService) {
    return NextResponse.json(
      { message: "Falta SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as {
    restaurant_id: string;
    name: string;
    description?: string | null;
    price: number | string;
    image_url?: string | null;
    category?: string | null;
    extras?: OptionInput[] | null;
    excludes?: OptionInput[] | null;
    is_active?: boolean;
  };

  const restaurantId = (body.restaurant_id ?? "").trim();
  const name = (body.name ?? "").trim();
  const description = (body.description ?? null) || null;
  const imageUrl = (body.image_url ?? null) || null;
  const category = (body.category ?? null) || null;
  const price = Number(body.price);
  const extras = normalizeOptions(body.extras);
  const excludes = normalizeOptions(body.excludes);
  const isActive = typeof body.is_active === "boolean" ? body.is_active : true;

  if (!restaurantId || !name || !Number.isFinite(price) || price < 0) {
    return NextResponse.json(
      { message: "Datos inválidos para crear el producto." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseService
    .from("products")
    .insert([
      {
        restaurant_id: restaurantId,
        name,
        description,
        price,
        image_url: imageUrl,
        category,
        extras,
        excludes,
        is_active: isActive,
      },
    ])
    .select("id")
    .single();

  if (error || !data?.id) {
    console.error("[admin/products POST]", error);
    return NextResponse.json(
      { message: "No se pudo crear el producto." },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }
  if (!supabaseService) {
    return NextResponse.json(
      { message: "Falta SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const body = (await request.json()) as {
    id: string;
    name?: string;
    description?: string | null;
    price?: number | string;
    image_url?: string | null;
    category?: string | null;
    extras?: OptionInput[] | null;
    excludes?: OptionInput[] | null;
    is_active?: boolean;
  };

  const id = (body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ message: "Falta id." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.name === "string") update.name = body.name.trim();
  if (body.description !== undefined) update.description = body.description || null;
  if (body.image_url !== undefined) update.image_url = body.image_url || null;
  if (body.category !== undefined) update.category = body.category || null;
  if (typeof body.is_active === "boolean") update.is_active = body.is_active;
  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        { message: "Precio inválido." },
        { status: 400 }
      );
    }
    update.price = price;
  }
  if (body.extras !== undefined) update.extras = normalizeOptions(body.extras);
  if (body.excludes !== undefined) update.excludes = normalizeOptions(body.excludes);

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ message: "Nada para actualizar." }, { status: 400 });
  }

  const { error } = await supabaseService.from("products").update(update).eq("id", id);
  if (error) {
    console.error("[admin/products PATCH]", error);
    return NextResponse.json(
      { message: "No se pudo actualizar el producto." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await requireUser(request);
  if (!user) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }
  if (!supabaseService) {
    return NextResponse.json(
      { message: "Falta SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const id = (url.searchParams.get("id") ?? "").trim();
  if (!id) {
    return NextResponse.json({ message: "Falta id." }, { status: 400 });
  }

  const { error } = await supabaseService.from("products").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      const { error: softError } = await supabaseService
        .from("products")
        .update({ is_active: false })
        .eq("id", id);
      if (!softError) {
        return NextResponse.json({
          ok: true,
          softDeleted: true,
          message:
            "No se puede eliminar porque esta asociado a pedidos. Se desactivo el producto y puedes reactivarlo desde la lista.",
        });
      }
      if (softError.code === "42703") {
        return NextResponse.json(
          {
            message:
              "No se puede eliminar porque esta asociado a pedidos. Ejecuta la migracion para desactivar productos.",
          },
          { status: 409 }
        );
      }
      console.error("[admin/products DELETE soft]", softError);
      return NextResponse.json(
        { message: "No se pudo desactivar el producto." },
        { status: 500 }
      );
    }
    console.error("[admin/products DELETE]", error);
    return NextResponse.json(
      { message: "No se pudo eliminar el producto." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
