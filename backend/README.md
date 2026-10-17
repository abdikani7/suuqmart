# SuuqMart backend (Supabase)

There is no custom server. The backend is a Supabase project configured by one file:

- `supabase/schema.sql` — tables, indexes, triggers, RPC functions (`place_order`, `admin_stats`), RLS policies, the `product-images` storage bucket and policies, and seed data (5 categories, 11 products).

Run it once in **Supabase Dashboard → SQL Editor**. On a fresh project it runs as-is. To re-run it, drop the tables first or use a new project.
