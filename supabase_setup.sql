-- ====================================================
-- CallSolution Voice Analyser - Database Setup
-- Voer dit uit in de Supabase SQL Editor
-- ====================================================

-- Tabel voor gesprekken
create table if not exists public.gesprekken (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  titel text not null,
  medewerker_naam text,
  klant_naam text,
  sentiment text check (sentiment in ('positief', 'negatief', 'neutraal')),
  resultaat text check (resultaat in ('sale', 'geen sale', 'follow-up', 'onbekend')),
  notities text,
  bestand_pad text,
  bestand_naam text,
  bestand_grootte bigint,
  duur_seconden integer,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Automatisch updated_at bijwerken
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger gesprekken_updated_at
  before update on public.gesprekken
  for each row execute function update_updated_at();

-- Row Level Security (elke gebruiker ziet alleen zijn eigen gesprekken)
alter table public.gesprekken enable row level security;

create policy "Gebruikers zien eigen gesprekken" on public.gesprekken
  for select using (auth.uid() = user_id);

create policy "Gebruikers voegen eigen gesprekken toe" on public.gesprekken
  for insert with check (auth.uid() = user_id);

create policy "Gebruikers wijzigen eigen gesprekken" on public.gesprekken
  for update using (auth.uid() = user_id);

create policy "Gebruikers verwijderen eigen gesprekken" on public.gesprekken
  for delete using (auth.uid() = user_id);

-- ====================================================
-- Storage bucket voor audiobestanden
-- ====================================================
-- Ga naar Storage in Supabase en maak een bucket aan met de naam: gesprekken-audio
-- Stel in: Private bucket (niet publiek)
-- Of voer onderstaande uit via de Supabase Management API

-- Storage policies (na het aanmaken van de bucket)
-- create policy "Gebruikers uploaden eigen audio" on storage.objects
--   for insert with check (bucket_id = 'gesprekken-audio' and auth.uid()::text = (storage.foldername(name))[1]);
--
-- create policy "Gebruikers lezen eigen audio" on storage.objects
--   for select using (bucket_id = 'gesprekken-audio' and auth.uid()::text = (storage.foldername(name))[1]);
