# Architecture

Villela Flow is a Next.js 16 (App Router) application on Supabase. This document explains the
decisions that shape the code; the running ADR log is in [decisoes.md](./decisoes.md).

## The funnel stage is derived, not stored

There is no "stage" column. `src/lib/funil-unificado/classificar.ts` resolves a deal's column as a
**cascade over facts**: payment > contract > proposal > meeting status. This mirrors the reference
system and makes an impossible state (a card in "paid contract" with no payment) unrepresentable.

The price of derivation is that dragging a card cannot just write a new position — it has to write
the **cause**. `transicoes.ts` is the matrix that maps "dropped into column X" to the fact that must
be recorded, and it **blocks illegal backward moves** across blocks. Both are pure functions with
colocated tests, chosen over a SQL `funil_unificado` view so the logic stays verifiable in isolation
(and avoids `security_invoker`); if volume grows, it can be promoted to a view.

"Expiring" (a proposal within two days of its deadline) is a **badge on the card**, not a separate
column — in the reference system the card *leaves* its column at the most critical moment and the
seller loses sight of it. Seven columns instead of eight.

## Role-scoped reads on top of RLS

Supabase RLS is the security boundary; the **role scope is a second, application-layer filter** in
`src/lib/escopo.ts`, applied as `.match()` clauses on queries. Three roles:

- `sdr` (affiliate) — only their own leads,
- `gerente` (manager) — the whole team plus a ranking,
- `vp` — every team plus a cross-team comparison.

`team_id` is `NOT NULL` on every business table and `requireContexto` demands a team; the `vp` role
is what grants the global view. Closing credit in the ranking is attributed to `lead.owner_id` (who
carries the book), not the event's `actor_id`.

## Google OAuth is custom, server-side

Supabase Auth is **not** used for Google — it does not refresh the `provider_token` and loses it
after a session refresh (a long-standing, open issue). Instead there is an own server-side OAuth
flow with the **refresh token encrypted at rest** (AES-256-GCM, `src/lib/crypto.ts`), from which
access tokens are minted to call the Calendar/Meet API. Booking a meeting provisions a Meet link as
part of the same flow.

## Supabase keys

The project uses the new `sb_publishable_…` / `sb_secret_…` key format; the legacy
`anon`/`service_role` keys are being retired. The **secret key never carries the `NEXT_PUBLIC_`
prefix** and is only read server-side.

## Diagnostic-report intake

Scheduling starts from a diagnostic-report link rather than a lead search. A pure parser
(`src/lib/diagnostico/villela-parser.ts`) validates the report URL's host and hash shape and turns
the report into structured funnel data; a stub answers any other URL so the demo never depends on
the external service. The URL host and API path are the client's own diagnostic product.

## Public proposals

`/proposta/[token]` is a public, login-free page keyed by an opaque token (`proposta-comercial/token.ts`,
covered by tests) that renders the commercial proposal as a downloadable PDF via
`@react-pdf/renderer`.

## Pure layers & testing

`src/lib/funil-unificado/{classificar,transicoes,montar}`, `escopo`, `ranking`, `periodo`,
`atividade`, `metricas`, `proposta-comercial/{prefill,sugestao-preco,token}`, `crypto` and the
`diagnostico` parser take plain rows and return plain values — no React, no live Supabase. That is
what the 19 Vitest suites exercise, stubbing `fetch` so they never hit the network. `strict: true`
is on; the demo seed (`scripts/seed.ts`) uses `fakerPT_BR` with a fixed seed so every demo identity
is fabricated and reproducible.

## Next.js 16 notes

The project runs on Next 16.2 (the plan targeted 15). Two conventions changed: `middleware.ts`
became `src/proxy.ts`, and `next lint` was removed in favour of `eslint .`. The `proxy.ts` matcher
excludes static media (`.mp4`/`.webm`) so the login-background video is not redirected to `/login`.
