# Cloud & DevOps Portfolio CMS

A fast, secure, and fully dynamic portfolio website with a complete browser-based Admin CMS powered by **Supabase** (Auth, Postgres Row Level Security, and Storage). Zero build step is required for static hosting, and environment-variable config generation is included for CI/CD deployments.

## Highlights

- **100% Dynamic Admin Control**: Edit every headline, navigation label, hero metric, announcement banner, skills list, about copy, portrait image, career experience timeline, certifications, projects, social links, custom theme/accent colors, section visibility, and page section order from `/admin/dashboard.html`.
- **Fast Performance**:
  - Non-blocking Google Fonts via `<link rel="preconnect">` (no CSS `@import` waterfall).
  - Pre-paint theme & cached profile hydration (`assets/js/preload.js`) + Stale-While-Revalidate `localStorage` caching for near-instant repeat loads with zero flicker.
  - Below-the-fold `content-visibility: auto`, lazy-decoded images with `aspect-ratio` to prevent layout shift, and zero runtime npm dependencies.
- **Security Hardened**:
  - Strict Supabase admin allowlist (`public.admin_users` + `public.is_admin()` security-definer RLS function) — regular signed-up users cannot access admin controls or private data.
  - Strict URL validation (`https:`, safe relative `/assets/...` paths, `#anchors`, `mailto:` only where expected), zero `innerHTML` injection, and `noindex`/`no-referrer` on admin routes.
  - Production security headers preconfigured for **Vercel** (`vercel.json`), **Netlify** (`netlify.toml`), and **Cloudflare Pages** (`_headers`): `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and `Strict-Transport-Security`.
  - Contact form anti-spam protection (honeypot, minimum dwell-time check, client cooldown, and SQL email regex/length constraints).

## Run Locally

Serve the repository over HTTP (ES modules require HTTP rather than `file://`):

```sh
npm run dev
```

Or run the verification suite at any time:

```sh
npm run check
```

## Enable the Live Admin Dashboard (Supabase Setup)

1. Create a project in [Supabase](https://supabase.com/).
2. Open the **Supabase SQL Editor** and run the full script in [`supabase/schema.sql`](supabase/schema.sql).
   - This creates `admin_users`, `is_admin()`, `profile`, `projects`, `contact_messages`, strict RLS policies, and the `portfolio-assets` storage bucket for image uploads.
3. In **Authentication → Providers / Settings**, disable public sign-ups, then create your administrator user in **Authentication → Users**.
4. Grant that user admin privileges by running this query in the SQL Editor (replace with your email):

```sql
insert into public.admin_users (user_id, email)
select id, email from auth.users where email = 'YOUR_ADMIN_EMAIL@example.com'
on conflict (user_id) do nothing;
```

5. Configure your **public** Supabase URL and anon/publishable key using either method:
   - **Direct static edit**: Put them in `assets/js/config.js` (safe because RLS protects all writes and private reads; **never** use a `service_role` key).
   - **CI/CD environment variables (recommended)**: Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel, Netlify, or Cloudflare Pages (see `.env.example`). Their build command `node scripts/build-config.mjs` generates `assets/js/config.js` automatically on deploy.
6. Sign in at `/admin/login.html`.

## Deploy Anywhere

| Platform | Configuration Included | Build Command | Output Directory |
| :--- | :--- | :--- | :--- |
| **Vercel** | `vercel.json` | `node scripts/build-config.mjs` | `.` |
| **Netlify** | `netlify.toml` & `_headers` | `node scripts/build-config.mjs` | `.` |
| **Cloudflare Pages** | `_headers` | `node scripts/build-config.mjs` | `.` |
| **GitHub Pages** | `.nojekyll` | *(none — set `assets/js/config.js`)* | `/` |

After deploying, add your production domain (e.g., `https://yourdomain.com/**`) to **Supabase → Authentication → URL Configuration → Redirect URLs** before using `/admin/login.html`.
