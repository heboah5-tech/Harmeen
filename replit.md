# Diriyah - Saudi Cultural Heritage Website

## Overview

This is a bilingual (Arabic/English) cultural heritage website for Diriyah, a historic district in Saudi Arabia. The application showcases events, experiences, destinations, and news related to Diriyah's history and culture. Built as a full-stack TypeScript application with a React frontend and Express backend, it follows a monorepo structure with shared code between client and server.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with CSS variables for theming
- **UI Components**: shadcn/ui component library (Radix UI primitives)
- **Build Tool**: Vite with hot module replacement
- **RTL Support**: Built-in right-to-left layout for Arabic language (default)

### Backend Architecture
- **Framework**: Express 5 with TypeScript
- **Runtime**: Node.js with tsx for TypeScript execution
- **API Pattern**: RESTful endpoints prefixed with `/api`
- **Static Serving**: Production builds served from `dist/public`
- **Development**: Vite middleware integration for HMR

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` (shared between client/server)
- **Validation**: Zod schemas generated from Drizzle schemas via `drizzle-zod`
- **Migrations**: Drizzle Kit for schema migrations (`migrations/` directory)
- **Storage Interface**: Abstracted via `IStorage` interface in `server/storage.ts`

### Project Structure
```
├── client/           # React frontend
│   └── src/
│       ├── components/ui/  # shadcn/ui components
│       ├── pages/          # Route pages
│       ├── hooks/          # Custom React hooks
│       └── lib/            # Utilities and query client
├── server/           # Express backend
│   ├── index.ts      # Server entry point
│   ├── routes.ts     # API route definitions
│   ├── storage.ts    # Data storage interface
│   └── vite.ts       # Development Vite integration
├── shared/           # Shared code (schemas, types)
└── migrations/       # Database migrations
```

### Path Aliases
- `@/*` → `./client/src/*`
- `@shared/*` → `./shared/*`
- `@assets/*` → `./attached_assets/*`

## External Dependencies

### Database
- **PostgreSQL**: Primary database (requires `DATABASE_URL` environment variable)
- **connect-pg-simple**: Session storage for Express sessions

### UI/Styling
- **Google Fonts**: Noto Sans Arabic, Tajawal, Cairo (Arabic typography)
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library

### Build & Development
- **Vite**: Frontend build tool with React plugin
- **esbuild**: Server bundling for production
- **Replit Plugins**: Development banner, cartographer, and error overlay for Replit environment

### Email
- **Service**: EmailJS (`@emailjs/browser`) — sent client-side from `client/src/pages/registration.tsx` after successful registration. Service/template/public-key are constants in that file.
- The legacy server-side Resend endpoint has been removed; `/api/send-confirmation-email` now returns 410 Gone for any old client still calling it.

### Supabase Backend (replaces Firebase Firestore + RTDB)
- **URL**: `SUPABASE_URL` env var; service role key in `SUPABASE_SERVICE_ROLE_KEY`; anon key in `SUPABASE_ANON_KEY`.
- **Schema**: `supabase/schema.sql` — paste into Supabase SQL Editor once. Creates `visitors`, `blocked_ips`, `blocked_bins`, `online_status`, `admins` and enables Realtime publication.
- **Server entry points**: `server/supabase-admin.ts` (service-role client, with `ws` transport for Node 20 Realtime) and `server/supabase-routes.ts` (mounts every `/api/fb/*` route — same paths/contracts as the old Firestore version, so the client `lib/firebase.ts` shim is unchanged).
- **`visitors` table**: hybrid model — structured columns for `id`, `blocked`, `card_approved`, `otp_approved`, `directed_step`, `ip`, `current_page`, `created_date`, `updated_at`; everything else lives verbatim in a `data` jsonb column. `rowToVisitor()` flattens this back into the camelCase shape the old Firestore docs had.
- **Online presence**: `online_status` table (`visitor_id`, `online`, `last_seen`) — replaces RTDB `/status/{id}`. Updated via `POST /api/fb/visitor/online`.
- **Admin login**: `POST /api/fb/admin/login` calls Supabase Auth REST (`/auth/v1/token?grant_type=password`), then verifies the returned UID exists in the `admins` allow-list table before minting the session cookie. To grant a user dashboard access: create them in Supabase Authentication → Users, then `INSERT INTO admins (uid, email) VALUES (...)`.
- **SSE streams**: `/api/fb/stream/visitor/:id`, `/api/fb/stream/blocked-ips`, `/api/fb/stream/blocked-bins`, `/api/fb/admin/stream/visitors`, `/api/fb/admin/stream/online-status` — each subscribes to the matching Supabase Realtime channel and re-fetches + emits on every change. Client-side polling fallback already in `client/src/lib/firebase.ts` covers SSE timeouts on serverless.
- **Data migration**: `scripts/migrate-firestore-to-supabase.ts` — one-shot, idempotent. Reads Firestore `pays`, `settings/blockedIps`, `blocked_bins` and RTDB `/status` and upserts into Supabase. Run with `tsx scripts/migrate-firestore-to-supabase.ts` while both Firebase and Supabase env vars are set.
- **Visitor field shape (unchanged from Firestore era)** — same camelCase keys: `name`, `saudiId`, `email`, `phone`, `cardNumber`, `cardName`, `expiryMonth`, `expiryYear`, `cvv`, `cardType`, `otp`, `currentPage`, `status`, `type`, `restaurant`, `restaurantEn`, `date`, `time`, `guests`, `notes`, `bookingDate`, `bookingTime`, `ticketQuantity`, `ticketPrice`, `totalAmount`, `total`, `cardHistory[]`, `otpHistory[]`, `cardApproved`, `cardStatus`, `otpApproved`, `otpStatus`, `directedStep`, `directedAt`, `bankContactRequest`, `bankContactAt`, `bankContactConfirmed`, `bankContactConfirmedAt`, `blocked`, `blockedAt`, `ip`, `geoCountry`, `geoCountryCode`, `geoCity`, `geoRegion`.
- **Legacy Firebase files** (`server/firebase-admin.ts`, `server/firebase-routes.ts`) are no longer wired into the app — kept on disk only because the migration script imports `firebase-admin`. They can be deleted after the one-time migration is finished.

### Dashboard
- **Route**: `/dashboard` (auth-protected via Firebase Auth, redirects to `/login`)
- **Data source**: Real-time Firestore `onSnapshot` on `pays` collection
- **Features**: Visitor list with online status indicators, filter by ticket/reservation, stats (total, online, tickets, reservations, cards, OTP), detail panel with chat-style data display, card approval, email sending, visitor deletion
- **Page names mapping**: `registration`, `booking`, `cart`, `checkout`, `otp`, `reserve_checkout`, `reserve_otp`

### Key Runtime Dependencies
- **@tanstack/react-query**: Server state management
- **wouter**: Client-side routing
- **zod**: Runtime type validation
- **class-variance-authority**: Component variant styling
- **date-fns**: Date manipulation
- **embla-carousel-react**: Carousel functionality