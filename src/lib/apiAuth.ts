import { NextResponse } from "next/server";

// Shared helpers for the read-only /api/v1/* JSON endpoints. External
// consumers (currently: DWBC — the destination wedding budget calculator)
// call these with a static API key and expect CORS to permit their origin.

const ALLOWED_ORIGIN = "https://destawed.vercel.app";

export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "x-api-key, content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function preflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// Returns a NextResponse when the request should be rejected (missing
// server config → 500, missing/bad key → 401), or null when auth passes.
// Errors are NOT cached; the caller adds cache headers to successful bodies.
export function requireApiKey(req: Request): NextResponse | null {
  const expected = process.env.OFFSITE_API_KEY;
  if (!expected) {
    return jsonNoCache({ error: "API not configured" }, 500);
  }
  const provided = req.headers.get("x-api-key");
  if (!provided || provided !== expected) {
    return jsonNoCache({ error: "Unauthorized" }, 401);
  }
  return null;
}

// Success response — 60s edge cache + SWR window so repeat DWBC requests
// don't hammer Prisma on every page load.
export function jsonCached(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      ...corsHeaders(),
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

// Error / uncacheable response.
export function jsonNoCache(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      ...corsHeaders(),
      "Cache-Control": "no-store",
    },
  });
}
