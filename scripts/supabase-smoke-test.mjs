import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const p = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(p)) return;
  const raw = fs.readFileSync(p, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing env vars NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: restaurantRows, error: restaurantError } = await supabase
  .from("restaurants")
  .select("id,slug")
  .order("name", { ascending: true })
  .limit(1);

if (restaurantError || !restaurantRows || restaurantRows.length === 0) {
  console.error("Cannot load restaurants:", restaurantError ?? "no restaurants");
  process.exit(2);
}

const restaurant = restaurantRows[0];

const { data: productRows, error: productError } = await supabase
  .from("products")
  .select("id,price")
  .eq("restaurant_id", restaurant.id)
  .order("name", { ascending: true })
  .limit(1);

if (productError || !productRows || productRows.length === 0) {
  console.error("Cannot load products:", productError ?? "no products");
  process.exit(3);
}

const product = productRows[0];
const table = `SMOKE-${Date.now().toString().slice(-6)}`;
const total = Number(product.price);

const { data: orderRows, error: orderError } = await supabase
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

if (orderError || !orderRows?.id) {
  console.error("Order insert failed:", orderError);
  process.exit(4);
}

const orderId = orderRows.id;
const { error: itemError } = await supabase.from("order_items").insert([
  {
    order_id: orderId,
    product_id: product.id,
    quantity: 1,
    price: total,
  },
]);

if (itemError) {
  console.error("Order item insert failed:", itemError);
  await supabase.from("orders").delete().eq("id", orderId);
  process.exit(5);
}

console.log(
  `Smoke test OK. Created order ${orderId} for ${restaurant.slug} (${table}).`
);
