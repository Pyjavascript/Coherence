-- "Message to adapt" is saved with the brand, so it survives a refresh.

alter table public.brands
  add column if not exists message text not null default '';
