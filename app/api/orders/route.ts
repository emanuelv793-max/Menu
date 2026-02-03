import { NextResponse } from "next/server";
import { supabaseService, hasServiceKey } from "@/lib/supabaseService";
import { supabaseServer } from "@/lib/supabaseServer";

type BodyItem = {
  productId: string;
  qty: number;
  note?: string;
  modifiers?: {
    id?: string;
    label: string;
    type: "remove" | "extra";
    price?: number;
  }[];
};

export async function POST(request: Request) {
  const body = (await request.json()) as {
    restaurantSlug: string;
    table: string;
    items: BodyItem[];
  };

  const table = (body.table ?? "").trim();
  const restaurantSlug = (body.restaurantSlug ?? "").trim();

  if (!restaurantSlug || !table || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { message: "Datos incompletos para crear el pedido." },
      { status: 400 }
    );
  }

  // Usa service key si está disponible; de lo contrario, cliente server-side (sujeto a RLS)
  const supabase = supabaseService ?? supabaseServer();

  // 1) Restaurante
  const { data: restaurant, error: restError } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", restaurantSlug)
    .single();

  if (restError || !restaurant) {
    return NextResponse.json({ message: "Restaurante no encontrado." }, { status: 404 });
  }

  // 2) Precios de productos
  const productIds = body.items.map((i) => i.productId);
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, price")
    .in("id", productIds);

  if (productsError || !products || products.length === 0) {
    return NextResponse.json({ message: "No se pudieron cargar los productos." }, { status: 400 });
  }

  const priceMap = new Map(products.map((p) => [p.id, Number(p.price)]));

  const items = body.items.map((item) => {
    const basePrice = priceMap.get(item.productId) ?? 0;
    const modifiers = (item.modifiers ?? []).map((m) => ({
      id: m.id,
      label: m.label,
      type: m.type,
      price: Number(m.price ?? 0),
    }));
    const extraSum = modifiers
      .filter((m) => m.type === "extra")
      .reduce((sum, m) => sum + (Number.isFinite(m.price) ? m.price : 0), 0);
    return {
      product_id: item.productId,
      quantity: item.qty,
      note: item.note ?? null,
      price: basePrice + extraSum,
      modifiers,
    };
  });

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // 3) Crear pedido
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert([
      {
        restaurant_id: restaurant.id,
        table_number: table,
        status: "enviado",
        total,
      },
    ])
    .select("id")
    .single();

  if (orderError || !order?.id) {
    return NextResponse.json(
      {
        message:
          "No se pudo crear el pedido en la base de datos." +
          (hasServiceKey ? "" : " Agrega SUPABASE_SERVICE_ROLE_KEY para omitir RLS."),
      },
      { status: 500 }
    );
  }

  // 4) Items
  const itemsPayload = items.map((i) => ({
    order_id: order.id,
    product_id: i.product_id,
    quantity: i.quantity,
    note: i.note,
    price: i.price,
  }));

  let { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .insert(itemsPayload)
    .select("id");

  // Reintento con service role explícito si falló
  if ((itemsError || !orderItems) && supabaseService && supabase !== supabaseService) {
    const retry = await supabaseService
      .from("order_items")
      .insert(itemsPayload)
      .select("id");
    if (!retry.error && retry.data) {
      orderItems = retry.data;
      itemsError = null;
    } else {
      itemsError = retry.error;
    }
  }

  if (itemsError || !orderItems) {
    console.error("[api/orders] order_items error", itemsError);
    // Limpia el pedido huérfano para evitar órdenes sin ítems
    await supabase.from("orders").delete().eq("id", order.id);
    return NextResponse.json(
      { message: `No se pudieron guardar los ítems: ${itemsError?.message ?? "error"}` },
      { status: 500 }
    );
  }

  // 5) Modificadores
  const flatModifiers = orderItems.flatMap((orderItem, idx) => {
    const source = items[idx];
    return (source.modifiers ?? []).map((m) => ({
      order_item_id: orderItem.id,
      modifier_id: m.id ?? null,
      label: m.label,
      type: m.type,
      price: Number(m.price ?? 0),
    }));
  });

  if (flatModifiers.length > 0) {
    const { error: modsError } = await supabase
      .from("order_item_modifiers")
      .insert(flatModifiers);
    if (modsError) {
      console.error("[api/orders] order_item_modifiers error", modsError);
      // No cancelamos la orden porque los ítems ya están; solo reportamos
      return NextResponse.json(
        { message: `Pedido creado, pero fallaron las modificaciones: ${modsError.message}` },
        { status: 206 }
      );
    }
  }

  return NextResponse.json({ orderId: order.id }, { status: 201 });
}
