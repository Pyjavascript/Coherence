create table public.user_usage (
  user_id uuid not null,
  generations integer not null default 0,
  constraint client_usage_pkey primary key (user_id)
) TABLESPACE pg_default;




create table public.research_notes (
  id uuid not null default gen_random_uuid (),
  brand_id uuid not null,
  type text not null,
  text text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint research_notes_pkey primary key (id),
  constraint research_notes_brand_id_fkey foreign KEY (brand_id) references brands (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists research_notes_brand_idx on public.research_notes using btree (brand_id) TABLESPACE pg_default;

create trigger research_notes_updated_at BEFORE
update on research_notes for EACH row
execute FUNCTION set_updated_at ();



create table public.nodes (
  id uuid not null default gen_random_uuid (),
  brand_id uuid not null,
  category text not null,
  label text not null default ''::text,
  brief text not null default ''::text,
  words integer not null default 60,
  requirements text not null default ''::text,
  filename text not null default ''::text,
  platform text null,
  component text not null default 'hero'::text,
  pointer_count integer not null default 3,
  connections jsonb not null default '[]'::jsonb,
  variants jsonb not null default '[]'::jsonb,
  active_idx integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint nodes_pkey primary key (id),
  constraint nodes_brand_id_fkey foreign KEY (brand_id) references brands (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists nodes_brand_idx on public.nodes using btree (brand_id) TABLESPACE pg_default;

create trigger nodes_updated_at BEFORE
update on nodes for EACH row
execute FUNCTION set_updated_at ();



create table public.generations (
  id uuid not null default gen_random_uuid (),
  brand_id uuid null,
  medium text not null,
  input_context jsonb null,
  output jsonb null,
  created_at timestamp with time zone not null default now(),
  user_id uuid null default auth.uid (),
  constraint generations_pkey primary key (id),
  constraint generations_brand_id_fkey foreign KEY (brand_id) references brands (id) on delete CASCADE,
  constraint generations_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

create index IF not exists generations_brand_idx on public.generations using btree (brand_id) TABLESPACE pg_default;


create table public.brands (
  id uuid not null default gen_random_uuid (),
  name text not null,
  scope text not null default 'regular'::text,
  belief text not null default ''::text,
  industry text not null default 'general'::text,
  stage text not null default 'Discovery'::text,
  mode text not null default 'Emotional'::text,
  audience text not null default 'Cold — scrolling, distracted'::text,
  pain text not null default ''::text,
  emo text not null default 'Curiosity'::text,
  formality text not null default 'Conversational'::text,
  objection text not null default ''::text,
  cta text not null default 'Soft'::text,
  banned text not null default ''::text,
  must_include text not null default ''::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  user_id uuid null default auth.uid (),
  color text not null default '#4653FF'::text,
  constraint brands_pkey primary key (id),
  constraint brands_user_id_fkey foreign KEY (user_id) references auth.users (id),
  constraint brands_scope_check check (
    (
      scope = any (array['regular'::text, 'global'::text])
    )
  )
) TABLESPACE pg_default;

create trigger brands_limit BEFORE INSERT on brands for EACH row
execute FUNCTION enforce_brand_limit ();

create trigger brands_updated_at BEFORE
update on brands for EACH row
execute FUNCTION set_updated_at ();