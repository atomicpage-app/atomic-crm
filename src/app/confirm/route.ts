import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.SUPABASE_URL!,                 // <- sua env
  process.env.SUPABASE_SERVICE_ROLE_KEY!     // <- sua env
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token")?.trim();
    const email = searchParams.get("email")?.trim()?.toLowerCase();

    if (!token) {
      return NextResponse.json({ ok: false, error: "MISSING_TOKEN" }, { status: 400 });
    }

    const filters = email
      ? { confirmation_token: token, email }
      : { confirmation_token: token };

    const { data: lead, error: findErr } = await supabase
      .from("leads")
      .select("id,email,confirmation_expires_at,confirmation_confirmed_at")
      .match(filters)
      .maybeSingle();

    if (findErr) {
      console.error("DB_FIND_ERROR:", findErr);
      return NextResponse.json({ ok: false, error: "DB_FIND_ERROR" }, { status: 500 });
    }
    if (!lead) {
      return NextResponse.json({ ok: false, action: "confirm", token, email, error: "TOKEN_NOT_FOUND" }, { status: 404 });
    }

    if (lead.confirmation_expires_at && new Date(lead.confirmation_expires_at) < new Date()) {
      return NextResponse.json({ ok: false, action: "confirm", token, email: lead.email, error: "TOKEN_EXPIRED" }, { status: 410 });
    }

    const now = new Date().toISOString();
    const { data: updated, error: updErr } = await supabase
      .from("leads")
      .update({
        confirmation_confirmed_at: now,
        confirmation_token: null,
        confirmation_expires_at: null,
      })
      .eq("id", lead.id)
      .select("id")
      .single();

    if (updErr) {
      console.error("DB_UPDATE_ERROR:", updErr);
      return NextResponse.json({ ok: false, error: "DB_UPDATE_ERROR" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      action: "confirm",
      token,
      email: lead.email,
      confirmedId: updated?.id ?? lead.id,
    });
  } catch (err: any) {
    console.error("UNEXPECTED_ERROR:", err);
    return NextResponse.json({ ok: false, error: "UNEXPECTED_ERROR", detail: err?.message }, { status: 500 });
  }
}