# Offsite.ai

An Airbnb for hotel venues. DestaLabs operates as the **agent**: your team logs in,
creates hotel profiles, and manages every venue on the hotels' behalf. Consumers
browse the public marketplace, compare pricing and policies, and reserve a date with
a deposit.

Test market: **Cancún & the Riviera Maya.**

## Stack

- **Next.js 15** (App Router, Server Components + Server Actions) + **TypeScript**
- **Prisma** ORM
- **SQLite** for local dev — swap `DATABASE_URL` to Postgres/Supabase for production, no code changes
- **Auth**: bcrypt-hashed passwords + signed JWT session (`jose`) in an httpOnly cookie, `/admin` protected by edge middleware
- Plain CSS design system (Fraunces + Hanken Grotesk)

## Run it

```bash
npm install
cp .env.example .env        # then edit SESSION_SECRET (openssl rand -base64 32)
npm run setup               # creates the DB, pushes schema, seeds admin + sample data
npm run dev                 # http://localhost:3000
```

**Team login:** `admin@destalabs.com` / `destalabs2026` (from `.env`, change before deploy).

## Routes

| Route | What it is |
|---|---|
| `/` | Public marketplace home |
| `/venues` | Browse + filter (event type, tags, venue type) |
| `/venues/[id]` | Venue detail + deposit request flow |
| `/login` | Team sign-in |
| `/admin` | Agent dashboard (stats, hotels, recent requests) |
| `/admin/hotels/new` | Create a hotel profile |
| `/admin/hotels/[id]` | Hotel detail + its venues |
| `/admin/hotels/[id]/venues/new` | Add a venue listing |
| `/admin/bookings` | Booking-request queue (confirm / decline) |

## Data model

`User` (team) → creates `Hotel` → has many `Venue` → receives `BookingRequest`.
Array/object fields (tags, included, layouts, rules) are stored as JSON text so the
schema is portable to Postgres unchanged.

## Public JSON API (read-only)

`/api/v1/*` exposes hotels + published venues to trusted external
consumers — currently DWBC (the destination wedding budget calculator).

**Auth.** Every request must carry the `x-api-key` header. The value must
match the `OFFSITE_API_KEY` env var. Missing/wrong key → `401`. No key
configured on the server → `500`.

**CORS.** Preflights (`OPTIONS`) succeed for the DWBC origin
(`https://destawed.vercel.app`); other origins get no `Access-Control-*`
back and the browser blocks the response. Server-to-server callers are
unaffected.

**Caching.** Successful responses set
`Cache-Control: public, s-maxage=60, stale-while-revalidate=300` so
Vercel's edge holds each payload for 60s (with a 5-min SWR window).
Errors are `no-store`.

### `GET /api/v1/hotels`

```json
{
  "hotels": [
    { "id": "cxx…", "name": "The Ritz-Carlton, Cancún", "city": "Cancún",
      "cover": "https://…/blob/…jpg" }
  ]
}
```

`cover` is the first photo of the hotel's first PUBLISHED venue, or `null`.

### `GET /api/v1/hotels/{id}`

```json
{
  "id": "cxx…",
  "name": "…", "brand": "…", "description": "…",
  "market": "Cancún", "address": "…", "city": "…",
  "region": "…", "country": "…",
  "latitude": 21.16, "longitude": -86.85,
  "cover": "https://…/blob/…jpg",
  "venues": [
    {
      "id": "cvv…",
      "name": "Oceanfront Terrace",
      "type": "Beachfront",
      "description": "…",
      "seated": 180, "standing": 260, "sqft": 3200,
      "pricingOptions": [
        { "label": "Half-day · 4 hours", "durationHours": 4, "price": 8500 }
      ],
      "cover": "https://…/blob/…jpg",
      "photos": ["https://…/blob/…jpg"],
      "blackoutDates": ["2026-08-14", "2026-09-02"]
    }
  ]
}
```

Only `PUBLISHED` venues are returned. `blackoutDates` is the practical
"can't be booked" set — admin-set blackouts merged with dates from
CONFIRMED / DEPOSIT_HELD / COMPLETED bookings, deduped and sorted.
Unknown hotel id → `404`.

### Example

```bash
curl -H "x-api-key: $OFFSITE_API_KEY" \
  https://<your-vercel-domain>/api/v1/hotels
```

## The payment seam (next layer)

Booking is **concierge-first** right now: a request is recorded and the deposit amount
is shown, but no charge happens. The integration point is marked in
`src/lib/actions.ts` (`createBookingAction`, "STRIPE SEAM"). Drop a Stripe Connect
PaymentIntent (manual capture for the hold) + split payout to the hotel there, and the
flow becomes live money without touching the UI.

## Going to production

1. Point `DATABASE_URL` at Postgres/Supabase, change `provider` in `prisma/schema.prisma` to `postgresql`, run `prisma db push`.
2. Set a strong `SESSION_SECRET`.
3. Add Stripe Connect (the seam above) + KYC onboarding per hotel.
4. Add transactional email (Resend) on booking request + status change.
5. Deploy to Vercel.
