# Villela Flow

**A lean sales CRM for a field team.** A role-aware home with team metrics and ranking,
appointment scheduling that provisions Google Meet automatically, and a unified deal funnel —
from booking to signed contract — where a card's stage is *derived* from facts (payment >
contract > proposal > meeting), never stored. Public, tokenized PDF proposals close the loop.
Built with Next.js 16 and Supabase.

> 🇧🇷 [Leia em português](./README.pt-BR.md)

> **Note on data & credentials.** This is a portfolio copy of a project built for a client
> (Grupo Villela). Real people, companies and diagnostic-report identifiers in the fixtures
> have been replaced with fictional values; every secret lives only in `.env.local` (never
> committed — see [`.env.example`](./.env.example)); internal runbooks and meeting notes were
> removed. No real personal data or credentials are present in this repository or its history.

---

## Screenshots

| Manager home | Unified funnel | Public proposal |
|---|---|---|
| ![Home](docs/screenshots/01-home-gestor.png) | ![Funnel](docs/screenshots/03-funil.png) | ![Proposal](docs/screenshots/02-proposta-publica.png) |

## What it does

- **Role-aware home** — an affiliate (`sdr`) sees only their own work, a manager (`gerente`)
  sees the team plus a ranking, a VP (`vp`) sees every team plus a comparison. Scope is applied
  in the application layer (`src/lib/escopo.ts`) on top of Supabase RLS.
- **Scheduling** — books meetings and provisions a Google Meet link automatically. Google OAuth
  is a **custom server-side flow** (not Supabase's) because Supabase Auth drops the
  `provider_token` on refresh; the refresh token is stored encrypted (AES-256-GCM).
- **Unified funnel** — a seven-column Kanban from "scheduled" to "paid contract". The stage is
  **derived, not stored**: `classificar.ts` resolves it as a cascade (payment > contract >
  proposal > meeting status), so a card can never sit in "paid" without a payment. Dragging a
  card writes the *cause* (a proposal, a payment), and a transition matrix blocks illegal
  backward moves. "Expiring" is a **badge**, not a column — the card stays where the seller
  expects it.
- **Public proposals** — a tokenized public page (`/proposta/[token]`) renders a commercial
  proposal as a downloadable PDF (`@react-pdf/renderer`), no login required.
- **Diagnostic-report intake** — scheduling starts from a diagnostic-report link that pre-fills
  the meeting; a pure parser turns the report into structured funnel data.

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** and the ADR log in
[docs/decisoes.md](docs/decisoes.md) for the design decisions.

## Tech stack

Next.js 16.2 (App Router, Turbopack) · React 19 · TypeScript (strict) · Tailwind v4 ·
shadcn/ui · Supabase (Auth + Postgres + RLS) · Google Calendar/Meet API · zod v4 ·
`@react-pdf/renderer` · Vitest.

## Getting started

**Prerequisites:** Node ≥ 20, npm, a Supabase project.

```bash
npm install
cp .env.example .env.local        # fill the values below
npx supabase link                 # link your Supabase project
npx supabase db push              # apply migrations (supabase/migrations)
npm run seed -- --reset           # fictional demo data (faker, seeded)
npm run dev                       # http://localhost:3005
```

### Environment

Every variable is documented in [`.env.example`](./.env.example):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase client |
| `SUPABASE_SECRET_KEY` | server-only Supabase key (never `NEXT_PUBLIC_`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Calendar/Meet OAuth |
| `GOOGLE_STATE_SECRET` / `TOKEN_ENCRYPTION_KEY` | OAuth state signing + refresh-token encryption (32-byte base64) |
| `APP_URL` | public base URL |

The project uses the new `sb_publishable_…` / `sb_secret_…` key format (the legacy
`anon`/`service_role` keys are being retired).

## Testing

Nineteen Vitest suites cover the pure layers — funnel classification and transition matrix,
scope filtering, ranking, period maths, proposal prefill/pricing, token crypto and the
diagnostic parser — with no network access (fetch is stubbed):

```bash
npm test          # vitest run
npm run typecheck # tsc --noEmit
npm run lint
```

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs lint, typecheck and the suites
on every push. The demo seed uses `fakerPT_BR` with a fixed seed — all demo identities are
fabricated.

## Project structure

```
src/
  app/(app)/      home, agendamento (scheduling), funil, administração, configurações
  app/(auth)/     login, signup, awaiting-approval
  app/proposta/   public tokenized proposal page
  app/api/google/ custom Google OAuth callback
  actions/        server actions
  lib/            pure domain logic (funil-unificado, diagnostico, proposta-comercial,
                  escopo, ranking, metricas, crypto, validators) + supabase/ google/ adapters
  components/     domain components + ui (shadcn)
supabase/migrations/  0001..0006 (RLS in 0002)
scripts/seed.ts       faker-seeded demo data
docs/                 ARCHITECTURE.md, decisoes.md (ADR log)
```

## License

Portfolio — all rights reserved © Emanuel Jordan. See [LICENSE](./LICENSE).
Built for Grupo Villela; published for portfolio evaluation.
