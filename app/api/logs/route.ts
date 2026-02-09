import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

type LogPayload = {
  source?: string;
  level?: "error" | "warn" | "info";
  message?: string;
  detail?: string;
  url?: string;
  context?: Record<string, unknown>;
};

export async function POST(request: Request) {
  let payload: LogPayload | null = null;
  try {
    payload = (await request.json()) as LogPayload;
  } catch {
    payload = null;
  }

  const message = (payload?.message ?? "").toString().slice(0, 500);
  if (!message) {
    return NextResponse.json({ message: "Missing message." }, { status: 400 });
  }

  if (!supabaseService) {
    console.error("[logs] missing service role key", payload);
    return NextResponse.json({ ok: true, stored: false });
  }

  const level = (payload?.level ?? "error").toString().slice(0, 20);
  const source = (payload?.source ?? "unknown").toString().slice(0, 80);
  const detail = (payload?.detail ?? "").toString().slice(0, 2000) || null;
  const url = (payload?.url ?? "").toString().slice(0, 300) || null;
  const context = payload?.context ?? null;

  const { error } = await supabaseService.from("app_error_logs").insert([
    {
      level,
      source,
      message,
      detail,
      url,
      context,
    },
  ]);

  if (error) {
    console.error("[logs] insert error", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
