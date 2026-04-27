create extension if not exists "pgcrypto";

create table companies (id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz default now());

create table profiles (id uuid primary key references auth.users on delete cascade, company_id uuid references companies on delete set null, full_name text, role text not null default 'member' check (role in ('admin', 'member')), created_at timestamptz default now());

create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name'); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure handle_new_user();

create table invitations (id uuid primary key default gen_random_uuid(), company_id uuid not null references companies on delete cascade, email text not null, token text not null unique default encode(gen_random_bytes(24), 'hex'), invited_by uuid references profiles on delete set null, accepted_at timestamptz, created_at timestamptz default now());

create table projects (id uuid primary key default gen_random_uuid(), company_id uuid not null references companies on delete cascade, job_number text, name text not null, address text, schedule_approved boolean not null default false, hw_cutsheet_path text, hw_cutsheet_media_type text, created_by uuid references profiles on delete set null, created_at timestamptz default now(), updated_at timestamptz default now());

create table doors (uid uuid primary key default gen_random_uuid(), door_id text not null, project_id uuid not null references projects on delete cascade, company_id uuid not null references companies on delete cascade, location text, manufacturer text, model text, thermal text default 'Thermal', elevation text, glass_tag text, glass_makeup text, glass_size text, has_midrail boolean not null default false, glass_size_midrail text, finish text, hw_set text, hw_schedule text, door_function text, swing text, transom boolean not null default false, sidelite boolean not null default false, fire_rated boolean not null default false, work_order text, qc_sheet text, qc_status text not null default 'Pending' check (qc_status in ('Pending', 'Approved', 'Failed')), qc_date date, elevation_image_path text, floorplan_image_path text, hw_items jsonb not null default '[]', created_by uuid references profiles on delete set null, created_at timestamptz default now(), updated_at timestamptz default now(), unique (door_id, project_id));
create index doors_project_id_idx on doors (project_id);
create index doors_company_id_idx on doors (company_id);

create table door_files (id uuid primary key default gen_random_uuid(), door_uid uuid not null references doors on delete cascade, company_id uuid not null references companies on delete cascade, name text not null, mime_type text, storage_path text not null, created_at timestamptz default now());
create index door_files_door_uid_idx on door_files (door_uid);

create table timeline_entries (id uuid primary key default gen_random_uuid(), door_uid uuid not null references doors on delete cascade, company_id uuid not null references companies on delete cascade, category text not null default 'General', body text, created_by uuid references profiles on delete set null, entry_ts timestamptz not null default now(), created_at timestamptz not null default now());
create index timeline_entries_door_uid_idx on timeline_entries (door_uid);

create table timeline_photos (id uuid primary key default gen_random_uuid(), entry_id uuid not null references timeline_entries on delete cascade, storage_path text not null, created_at timestamptz default now());
create index timeline_photos_entry_id_idx on timeline_photos (entry_id);

create or replace function door_search_vector(d doors) returns tsvector language sql immutable as $$ select to_tsvector('english', coalesce(d.door_id,'') || ' ' || coalesce(d.location,'') || ' ' || coalesce(d.manufacturer,'') || ' ' || coalesce(d.model,'') || ' ' || coalesce(d.hw_set,'') || ' ' || coalesce(d.door_function,'') || ' ' || coalesce(d.glass_makeup,'') || ' ' || coalesce(d.work_order,'') || ' ' || coalesce(d.finish,'')); $$;
create index doors_search_idx on doors using gin (door_search_vector(doors.*));

create or replace function set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger projects_updated_at before update on projects for each row execute procedure set_updated_at();
create trigger doors_updated_at before update on doors for each row execute procedure set_updated_at();

alter table companies enable row level security;
alter table profiles enable row level security;
alter table invitations enable row level security;
alter table projects enable row level security;
alter table doors enable row level security;
alter table door_files enable row level security;
alter table timeline_entries enable row level security;
alter table timeline_photos enable row level security;

create or replace function my_company_id() returns uuid language sql stable security definer as $$ select company_id from profiles where id = auth.uid(); $$;
create or replace function my_role() returns text language sql stable security definer as $$ select role from profiles where id = auth.uid(); $$;

create policy "members read own company" on companies for select using (id = my_company_id());
create policy "admins update company" on companies for update using (id = my_company_id() and my_role() = 'admin');
create policy "members read company profiles" on profiles for select using (company_id = my_company_id() or id = auth.uid());
create policy "users update own profile" on profiles for update using (id = auth.uid());
create policy "admins manage invitations" on invitations for all using (company_id = my_company_id() and my_role() = 'admin');
create policy "public read invitation by token" on invitations for select using (true);
create policy "company members access projects" on projects for all using (company_id = my_company_id());
create policy "company members access doors" on doors for all using (company_id = my_company_id());
create policy "company members access door files" on door_files for all using (company_id = my_company_id());
create policy "company members access timeline" on timeline_entries for all using (company_id = my_company_id());
create policy "company members access timeline photos" on timeline_photos for all using (exists (select 1 from timeline_entries te where te.id = timeline_photos.entry_id and te.company_id = my_company_id()));
