# SuuqMart

A full-stack tech store: React (Vite) + React Router + Tailwind CSS v4 on the front, Supabase (Postgres, Auth, Storage, Row Level Security) on the back.

```
suuqmart/
├── backend/supabase/schema.sql   # database, RLS, RPC, storage, seed data
└── frontend/                     # React app
    └── src/{components,context,lib,pages,pages/admin}
```

## 1. Create the Supabase project
1. Create a project at https://supabase.com.
2. Open **SQL Editor → New query**, paste all of `backend/supabase/schema.sql`, and click **Run**.
3. (Optional, for quick testing) **Authentication → Providers → Email**: turn off "Confirm email" so new accounts can log in immediately.
4. Go to **Project Settings → API** and copy the **Project URL** and the **anon public** key.

## 2. Run the frontend
```bash
cd frontend
cp .env.example .env      # then paste your URL and anon key
npm install
npm run dev               # http://localhost:5173
```
Only the anon key goes in the frontend. Never use the `service_role` key here.

## 3. Create the first admin
1. Sign up in the app.
2. In Supabase, open **Authentication → Users** and copy your user ID.
3. Run in the SQL Editor:
```sql
update profiles set role = 'admin' where id = 'PASTE-YOUR-USER-ID';
```
4. Log out and back in. An **Admin** link appears in the navbar (`/admin`).

## 4. Deploy to Vercel
1. Push the project to GitHub.
2. In Vercel, import the repo and set **Root Directory** to `frontend`.
3. Framework preset: Vite (build `npm run build`, output `dist`).
4. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
5. Deploy. `vercel.json` already rewrites all routes to `index.html` for React Router.
6. In Supabase **Authentication → URL Configuration**, set the Site URL to your Vercel domain.

## How it works
- **Roles:** visitor, customer, admin. `profiles.role` defaults to `customer`. A trigger creates the profile on signup.
- **Security:** RLS is on for every table. `is_admin()` is used in the policies. Users can't change their own role. Orders can only be created through the `place_order` RPC.
- **Cart:** stored in localStorage for visitors; on login it merges into `cart_items`. Quantities are capped at stock.
- **Checkout:** `place_order` runs in one transaction: it locks product rows, checks stock, uses database prices, creates the order and items, reduces stock and clears the cart. Mobile money is simulated (no real payment). Cancelling an order puts its items back in stock.
- **Admin:** overview stats, products (add/edit/delete, image upload, search, pagination), orders (details, status), categories, read-only users list.
- **Images:** the seed data uses placehold.co images. Admin uploads go to the `product-images` bucket.
