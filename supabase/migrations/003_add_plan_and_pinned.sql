alter table companies add column if not exists plan text not null default 'registry' check (plan in ('registry', 'pro'));
alter table projects add column if not exists pinned boolean not null default false;
