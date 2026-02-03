import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function Home() {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("restaurants")
    .select("slug")
    .order("name", { ascending: true })
    .limit(1);

  if (error || !data || data.length === 0) {
    throw new Error("No hay restaurantes configurados.");
  }

  redirect(`/r/${data[0].slug}`);
}
