import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RD_CLIENT_ID = Deno.env.get("RD_CLIENT_ID")!;
const RD_CLIENT_SECRET = Deno.env.get("RD_CLIENT_SECRET")!;
const RD_REDIRECT_URI = Deno.env.get("RD_REDIRECT_URI")!;
const RD_OAUTH_STATE_SECRET = Deno.env.get("RD_OAUTH_STATE_SECRET")!;
const RD_TOKEN_ENCRYPTION_KEY = Deno.env.get("RD_TOKEN_ENCRYPTION_KEY")!;
const RD_WEBHOOK_PATH_SECRET = Deno.env.get("RD_WEBHOOK_PATH_SECRET")!;
const PUBLIC_APP_URL = Deno.env.get("PUBLIC_APP_URL") || "";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const cors = {
  "Access-Control-Allow-Origin": PUBLIC_APP_URL || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function b64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function unb64(s: string) {
  const bin = atob(s);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
async function sha256(text: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}
async function hmac(text: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    await sha256(RD_OAUTH_STATE_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text))));
}
async function makeState(orgId: string, userId: string) {
  const payload = b64(new TextEncoder().encode(JSON.stringify({ orgId, userId, ts: Date.now() })));
  return payload + "." + await hmac(payload);
}
async function verifyState(state: string) {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) throw new Error("invalid_state");
  const expected = await hmac(payload);
  if (expected !== sig) throw new Error("invalid_state");
  const data = JSON.parse(new TextDecoder().decode(unb64(payload)));
  if (!data.ts || Date.now() - data.ts > 10 * 60 * 1000) throw new Error("expired_state");
  return data as { orgId: string; userId: string; ts: number };
}
async function cryptoKey() {
  return crypto.subtle.importKey(
    "raw",
    await sha256(RD_TOKEN_ENCRYPTION_KEY),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}
async function encrypt(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await cryptoKey(),
    new TextEncoder().encode(value),
  ));
  const out = new Uint8Array(iv.length + encrypted.length);
  out.set(iv, 0); out.set(encrypted, iv.length);
  return b64(out);
}
async function decrypt(value: string) {
  const raw = unb64(value);
  const iv = raw.slice(0, 12);
  const encrypted = raw.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await cryptoKey(), encrypted);
  return new TextDecoder().decode(plain);
}

async function rdToken(body: Record<string, string>) {
  const r = await fetch("https://api.rd.services/auth/token" + (body.code ? "?token_by=code" : ""), {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error_description || data?.error || "rd_token_error");
  return data;
}
async function refreshToken(orgId: string) {
  const { data: cred, error } = await admin.from("rdstation_credentials")
    .select("*").eq("organization_id", orgId).maybeSingle();
  if (error || !cred) throw new Error("rdstation_not_connected");
  const refresh = await decrypt(cred.refresh_token_ciphertext);
  const data = await rdToken({ client_id: RD_CLIENT_ID, client_secret: RD_CLIENT_SECRET, refresh_token: refresh });
  const access = data.access_token;
  const expiresAt = new Date(Date.now() + Number(data.expires_in || 86400) * 1000).toISOString();
  await admin.from("rdstation_credentials").update({
    access_token_ciphertext: await encrypt(access),
    refresh_token_ciphertext: await encrypt(data.refresh_token || refresh),
    access_token_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }).eq("organization_id", orgId);
  return access;
}
async function getAccessToken(orgId: string) {
  const { data: cred, error } = await admin.from("rdstation_credentials")
    .select("*").eq("organization_id", orgId).maybeSingle();
  if (error || !cred) throw new Error("rdstation_not_connected");
  if (cred.access_token_expires_at && new Date(cred.access_token_expires_at).getTime() > Date.now() + 60_000) {
    return decrypt(cred.access_token_ciphertext);
  }
  return refreshToken(orgId);
}

function rdContact(raw: any) {
  const legal = Array.isArray(raw?.legal_bases) ? raw.legal_bases : [];
  const consent = legal.some((x: any) => x?.category === "communications" && x?.status === "granted");
  return {
    external_id: raw.uuid || raw.id || raw.email,
    name: raw.name || raw.email || "Lead RD Station",
    email: raw.email || null,
    phone: raw.mobile_phone || raw.personal_phone || raw.phone || null,
    source: "rd_station",
    consent,
    utm_source: raw.utm_source || raw.cf_utm_source || null,
    utm_medium: raw.utm_medium || raw.cf_utm_medium || null,
    utm_campaign: raw.utm_campaign || raw.cf_utm_campaign || null,
    utm_content: raw.utm_content || raw.cf_utm_content || null,
    stage: raw.opportunity === true ? "oportunidade" : "novo",
  };
}

async function upsertLead(orgId: string, raw: any) {
  const mapped = rdContact(raw);
  if (!mapped.external_id) return "skipped";
  const { data: existing } = await admin.from("leads").select("id").eq("organization_id", orgId)
    .eq("external_source", "rd_station_marketing").eq("external_id", mapped.external_id).maybeSingle();
  const payload = {
    organization_id: orgId,
    name: mapped.name,
    email: mapped.email,
    phone: mapped.phone,
    source: mapped.source,
    consent: mapped.consent,
    utm_source: mapped.utm_source,
    utm_medium: mapped.utm_medium,
    utm_campaign: mapped.utm_campaign,
    utm_content: mapped.utm_content,
    external_source: "rd_station_marketing",
    external_id: mapped.external_id,
    stage: mapped.stage,
    updated_at: new Date().toISOString(),
  };
  if (existing?.id) {
    const { error } = await admin.from("leads").update(payload).eq("id", existing.id);
    if (error) throw error;
    return "updated";
  }
  const { error } = await admin.from("leads").insert(payload);
  if (error) throw error;
  return "inserted";
}

async function fetchJson(url: string, access: string) {
  const r = await fetch(url, {
    headers: { Authorization: "Bearer " + access, Accept: "application/json" },
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.message || data?.error || "rd_api_error");
  return data;
}

async function importAll(orgId: string) {
  let fetched = 0, inserted = 0, updated = 0, skipped = 0;
  const access = await getAccessToken(orgId);
  // RD Station Marketing exposes the standard "Todos os contatos da base de Leads" segmentation as id 1.
  for (let page = 1; page <= 1000; page++) {
    const url = new URL("https://api.rd.services/platform/segmentations/1/contacts");
    url.searchParams.set("page", String(page));
    url.searchParams.set("page_size", "125");
    const data = await fetchJson(url.toString(), access);
    const contacts = Array.isArray(data?.contacts) ? data.contacts : Array.isArray(data?.data) ? data.data : [];
    if (!contacts.length) break;
    for (const summary of contacts) {
      let full = summary;
      const email = summary.email || summary.email_address;
      const uuid = summary.uuid || summary.id;
      if (uuid || email) {
        const identifier = uuid ? "uuid:" + encodeURIComponent(uuid) : "email:" + encodeURIComponent(email);
        try { full = await fetchJson("https://api.rd.services/platform/contacts/" + identifier, access); } catch { /* summary is still useful */ }
      }
      fetched++;
      const result = await upsertLead(orgId, full);
      if (result === "inserted") inserted++;
      else if (result === "updated") updated++;
      else skipped++;
    }
    if (contacts.length < 125) break;
  }
  return { fetched, inserted, updated, skipped };
}

async function configureWebhooks(access: string, orgId: string) {
  const base = SUPABASE_URL + "/functions/v1/rdstation-sync/webhook/" + encodeURIComponent(RD_WEBHOOK_PATH_SECRET) + "?organization_id=" + encodeURIComponent(orgId);
  for (const event_type of ["WEBHOOK.CONVERTED", "WEBHOOK.MARKED_OPPORTUNITY"]) {
    const r = await fetch("https://api.rd.services/integrations/webhooks", {
      method: "POST",
      headers: { Authorization: "Bearer " + access, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ event_type, entity_type: "CONTACT", url: base, http_method: "POST", include_relations: ["CONTACT_FUNNEL"] }),
    });
    if (!r.ok && r.status !== 400) {
      const data = await r.json().catch(() => ({}));
      console.warn("rd_webhook_setup_failed", event_type, data);
    }
  }
}

async function handleWebhook(req: Request, orgId: string) {
  let body: any = {};
  try { body = await req.json(); } catch { return response({ ok: true, validation: true }); }
  // RD webhooks may retry; external_id makes processing idempotent.
  const result = await upsertLead(orgId, body);
  return response({ ok: true, result });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/functions\/v1\/rdstation-sync/, "") || "/";

  try {
    if (path.startsWith("/webhook/")) {
      const secret = path.split("/")[2];
      if (!secret || secret !== RD_WEBHOOK_PATH_SECRET) return response({ error: "unauthorized" }, 401);
      const orgId = url.searchParams.get("organization_id");
      if (!orgId) return response({ error: "missing_organization_id" }, 400);
      return await handleWebhook(req, orgId);
    }

    if (path === "/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !state) return response({ error: "missing_code_or_state" }, 400);
      const { orgId } = await verifyState(state);
      const token = await rdToken({ client_id: RD_CLIENT_ID, client_secret: RD_CLIENT_SECRET, code });
      const access = token.access_token;
      const refresh = token.refresh_token;
      if (!access || !refresh) throw new Error("rd_token_missing");
      await admin.from("rdstation_credentials").upsert({
        organization_id: orgId,
        access_token_ciphertext: await encrypt(access),
        refresh_token_ciphertext: await encrypt(refresh),
        access_token_expires_at: new Date(Date.now() + Number(token.expires_in || 86400) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "organization_id" });
      await admin.from("rdstation_connections").upsert({
        organization_id: orgId,
        status: "connected",
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_error: null,
      }, { onConflict: "organization_id,provider" });
      await configureWebhooks(access, orgId);
      return new Response('<!doctype html><meta charset="utf-8"><title>RD Station conectado</title><script>window.close();document.body.innerHTML="<h2>RD Station conectado. Você pode voltar ao Centro de Ensino Growth.</h2>"</script>', { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    const auth = req.headers.get("Authorization") || "";
    const userToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!userToken) return response({ error: "missing_authorization" }, 401);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: userData, error: userError } = await userClient.auth.getUser(userToken);
    if (userError || !userData.user) return response({ error: "unauthorized" }, 401);
    const { data: profile } = await admin.from("profiles").select("organization_id,role").eq("id", userData.user.id).maybeSingle();
    if (!profile?.organization_id) return response({ error: "profile_not_found" }, 403);
    const orgId = profile.organization_id;

    if (path === "/authorize") {
      const state = await makeState(orgId, userData.user.id);
      const u = new URL("https://api.rd.services/auth/dialog");
      u.searchParams.set("client_id", RD_CLIENT_ID);
      u.searchParams.set("redirect_uri", RD_REDIRECT_URI);
      u.searchParams.set("state", state);
      return response({ authorization_url: u.toString() });
    }

    if (path === "/sync") {
      const started = new Date().toISOString();
      const { data: run } = await admin.from("rdstation_sync_runs").insert({
        organization_id: orgId, mode: "import", status: "started", started_at: started,
      }).select("id").single();
      try {
        const result = await importAll(orgId);
        await admin.from("rdstation_sync_runs").update({
          status: "completed", fetched_count: result.fetched, inserted_count: result.inserted,
          updated_count: result.updated, skipped_count: result.skipped, completed_at: new Date().toISOString(),
        }).eq("id", run.id);
        await admin.from("rdstation_connections").update({ last_sync_at: new Date().toISOString(), last_error: null }).eq("organization_id", orgId);
        return response({ ok: true, ...result });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        await admin.from("rdstation_sync_runs").update({ status: "failed", error_message: message, completed_at: new Date().toISOString() }).eq("id", run.id);
        await admin.from("rdstation_connections").update({ status: "error", last_error: message, updated_at: new Date().toISOString() }).eq("organization_id", orgId);
        throw e;
      }
    }

    if (path === "/status") {
      const { data } = await admin.from("rdstation_connections").select("status,connected_at,last_sync_at,last_error,updated_at").eq("organization_id", orgId).maybeSingle();
      return response(data || { status: "pending" });
    }

    return response({ error: "not_found" }, 404);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return response({ error: message }, 400);
  }
});
