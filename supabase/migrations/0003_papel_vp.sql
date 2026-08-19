-- Papel 'vp' (vice-presidência): vê todas as equipes na Home.
-- O escopo por papel é aplicado na camada de aplicação (src/lib/escopo.ts);
-- o RLS de demo continua o mesmo.
alter table public.profiles drop constraint profiles_papel_check;
alter table public.profiles
  add constraint profiles_papel_check check (papel in ('gerente', 'sdr', 'vp'));
