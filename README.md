# IWILLWIN – Premium Mobile-First Scratch & Win Promotional Web Application

**IWILLWIN** is a production-grade promotional scratch-and-win platform built with **React 18, TypeScript, Vite, Tailwind CSS, GSAP, Supabase PostgreSQL, and Supabase Auth**. It features a mobile-first promotional game experience for participants and a dashboard for brand administrators.

---

## Key Features

### 🌟 Public Game Experience
- **Mobile-First & Touch Optimized**: Engineered specifically for 360px–430px mobile devices with responsive fallback for desktop/tablet.
- **GSAP Animation Suite**: GPU-accelerated staggered page load, error shake animations, number countdown digit morphs, and prize reveal bounces with `prefers-reduced-motion` compliance.
- **Instagram Follow Flow**: High-converting Instagram follow CTA with a 5-second countdown timer, animated state transition, and automatic submit button activation.
- **Interactive HTML5 Scratch Card Canvas**: Realistic metallic gold foil scratch layer with responsive touch tracking (`touch-action: none` to isolate page scrolling), scratch sound synthesis via Web Audio API, and percentage threshold auto-reveal.
- **Celebratory Prize Reveal**: Triumphant audio chime, confetti explosion, prize badge animations, and customizable redemption actions (e.g. WhatsApp/Website CTA).

### 🔒 Server-Side Atomic Prize Allocation Engine
- **Zero Frontend RNG**: Winning odds and prize allocation are computed solely on PostgreSQL via a `SECURITY DEFINER` stored procedure (`participate_and_scratch`).
- **Race Condition Immunity**: Uses PostgreSQL row-level locks (`FOR UPDATE`) to ensure simultaneous submissions never exceed available prize inventory.
- **Rate & Inventory Quotas**: Enforces total maximum caps, rolling hourly limits, and calendar daily limits.
- **Strict Duplicate Protection**: Enforces unique mobile numbers and/or email addresses per campaign at the database level.
- **Row-Level Security (RLS)**: Public users cannot inspect other participants' information, internal prize inventory, or odds weights.

### 📊 Responsive Admin Management Portal
- **Overview Dashboard**: Real-time participant counter, scratch completion rate, prize inventory meters, and live leads activity stream.
- **Campaigns Studio**: Create and manage multi-campaign promotions with custom slugs, branding, validation rules, and claim CTAs.
- **Prize Configuration Matrix**: Desktop sticky-header data table and mobile card view, real-time formula validation (`Remaining = Allocated - Supplied`), active toggles, and odds weighting.
- **Leads & Winners CRM**: Filter by campaign or scratch status, search by participant details, inspect full device/IP metadata, and download one-click CSV reports.
- **Asset Storage**: Supabase Storage bucket (`campaign-assets`) for logos, banners, and prize media.

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 18 (TypeScript) |
| **Build Tool** | Vite 6 |
| **Styling** | Tailwind CSS 3.4 |
| **Animation Engine** | GSAP 3.12 (GreenSock) |
| **Confetti & Effects** | canvas-confetti, Web Audio API |
| **Backend & DB** | Supabase (PostgreSQL 15) |
| **Authentication & RLS** | Supabase Auth + PostgreSQL RLS Policies |
| **Storage** | Supabase Storage (`campaign-assets`) |
| **Icons** | Lucide React |
| **Hosting & Deploy** | Vercel |

---

## Database Schema Overview

```text
public.campaigns
  ├── id (UUID, PK)
  ├── name, slug (Unique)
  ├── logo_url, banner_url, instagram_url
  ├── start_date, end_date, status ('Draft'|'Active'|'Paused'|'Completed')
  ├── require_name, require_mobile, require_email
  ├── unique_mobile, unique_email
  └── scratch_title, success_message, result_message, cta_text, cta_url

public.prizes
  ├── id (UUID, PK)
  ├── campaign_id (FK -> campaigns.id)
  ├── name, description, image_url
  ├── allocated_quantity, supplied_quantity, remaining_quantity
  ├── maximum_limit, daily_limit, hourly_limit
  ├── weight, display_order, is_active
  └── CONSTRAINT: remaining_quantity = (allocated_quantity - supplied_quantity)

public.leads
  ├── id (UUID, PK)
  ├── campaign_id (FK -> campaigns.id)
  ├── name, mobile, email
  ├── prize_id (FK -> prizes.id)
  ├── scratch_status ('Pending'|'Revealed')
  ├── ip_address, user_agent
  └── participated_at, revealed_at

public.prize_allocations
  ├── id (UUID, PK)
  ├── campaign_id, lead_id, prize_id
  └── allocated_at

public.admin_profiles
  ├── id (UUID, PK)
  ├── auth_user_id (FK -> auth.users.id)
  ├── email, role ('admin'|'super_admin')
  └── created_at, updated_at
```

---

## Environment Configuration

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_NAME=IWILLWIN
```

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```

### 3. Build for Production
```bash
npm run build
```

---

## Vercel Deployment

1. Import the repository into Vercel.
2. In **Environment Variables**, configure:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy! The included `vercel.json` ensures SPA routes (`/c/:slug`, `/admin/*`) resolve to `index.html`.

---

## License
Proprietary promotional software developed for **IWILLWIN**.
