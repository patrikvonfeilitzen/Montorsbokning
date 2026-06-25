-- Montörsbokning schema för Supabase

create extension if not exists pgcrypto;

create table if not exists public.installers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#2563eb',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  installer_id uuid not null references public.installers(id) on delete restrict,
  customer text not null,
  location text default '',
  status text not null default 'Bokad',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_booking_date_idx on public.bookings (booking_date);
create index if not exists bookings_installer_id_idx on public.bookings (installer_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

alter table public.installers enable row level security;
alter table public.bookings enable row level security;

-- Signage-vy och ICS-flöde: tillåt läsning utan inloggning
drop policy if exists "Public can read active installers" on public.installers;
create policy "Public can read active installers"
on public.installers
for select
using (active = true);

drop policy if exists "Public can read bookings" on public.bookings;
create policy "Public can read bookings"
on public.bookings
for select
using (true);

-- Admin: inloggade användare får skapa/ändra/ta bort
drop policy if exists "Authenticated can insert installers" on public.installers;
create policy "Authenticated can insert installers"
on public.installers
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated can update installers" on public.installers;
create policy "Authenticated can update installers"
on public.installers
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can insert bookings" on public.bookings;
create policy "Authenticated can insert bookings"
on public.bookings
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated can update bookings" on public.bookings;
create policy "Authenticated can update bookings"
on public.bookings
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated can delete bookings" on public.bookings;
create policy "Authenticated can delete bookings"
on public.bookings
for delete
to authenticated
using (true);

-- Startdata
insert into public.installers (name, color)
select 'Anders', '#2563eb'
where not exists (select 1 from public.installers where name = 'Anders');

insert into public.installers (name, color)
select 'Sara', '#16a34a'
where not exists (select 1 from public.installers where name = 'Sara');

insert into public.installers (name, color)
select 'Johan', '#ea580c'
where not exists (select 1 from public.installers where name = 'Johan');

insert into public.installers (name, color)
select 'Team 1', '#7c3aed'
where not exists (select 1 from public.installers where name = 'Team 1');
