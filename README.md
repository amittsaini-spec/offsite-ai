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
