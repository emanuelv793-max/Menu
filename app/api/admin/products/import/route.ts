import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseService } from "@/lib/supabaseService";
import { menuCartaSeed } from "@/src/seed/menuCarta.seed";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const requireUser = async (request: Request) => {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";

  if (!token || !supabaseUrl || !anonKey) return null;

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
};

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

  const body = (await request.json()) as { restaurantId?: string; slug?: string };
  let restaurantId = (body.restaurantId ?? "").trim();
  const slug = (body.slug ?? "domus").trim();

  if (!restaurantId) {
    const { data, error } = await supabaseService
      .from("restaurants")
      .select("id")
      .eq("slug", slug)
      .single();
    if (error || !data?.id) {
      return NextResponse.json(
        { message: "No se encontró el restaurante." },
        { status: 404 }
      );
    }
    restaurantId = data.id;
  }

  const { data: existingRows, error: existingError } = await supabaseService
    .from("products")
    .select("name")
    .eq("restaurant_id", restaurantId);

  if (existingError) {
    console.error("[admin/products/import existing]", existingError);
    return NextResponse.json(
      { message: "No se pudo leer el catálogo existente." },
      { status: 500 }
    );
  }

  const existingNames = new Set((existingRows ?? []).map((r) => (r.name ?? "").trim()));

  const payload = menuCartaSeed.map((item) => ({
    restaurant_id: restaurantId,
    name: item.name,
    description: item.description ?? "",
    price: item.price,
    image_url: item.image_url ?? null,
    category: item.category,
    extras: item.extras ?? [],
    excludes: item.excludes ?? [],
  }));

  const { data: upserted, error } = await supabaseService
    .from("products")
    .upsert(payload, { onConflict: "restaurant_id,name" })
    .select("name");

  if (error) {
    console.error("[admin/products/import upsert]", error);
    return NextResponse.json(
      { message: "No se pudo importar el menú." },
      { status: 500 }
    );
  }

  let created = 0;
  let updated = 0;
  (upserted ?? []).forEach((row) => {
    const name = (row.name ?? "").trim();
    if (existingNames.has(name)) updated += 1;
    else created += 1;
  });

  return NextResponse.json({
    created,
    updated,
    total: menuCartaSeed.length,
  });
}
