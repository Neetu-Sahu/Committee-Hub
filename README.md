# CampusHub — Academic Committee Management Portal

A full-stack MERN web app for managing college committees/clubs, built as an
extension of the original CampusHub admin portal — adding the student-facing
side: committee discovery for freshers, a unified updates feed, and an
interest-based recommendation + "new committee" gap-analytics engine.

## What's included

**Backend** (`/backend`) — Node.js + Express + MongoDB (Mongoose) + JWT auth
**Frontend** (`/frontend`) — React (Vite) + React Router + Recharts

### Core features implemented
- Role-based login: `fresher`, `student`, `committee_head`, `faculty_advisor`, `admin`
- Fresher onboarding survey (interests + skills) on first login
- Committee directory with tag-based **recommendations** for each student
- Committee profile pages (about, members, notices, events) + self-service **join requests**
- Unified student feed: notices, events (with posters), Hall of Fame (winners)
- Committee heads/admins can post notices & events, add winners
- Admin dashboard: create committees, review/approve join requests
- **Interest-gap analytics**: aggregates student interest tags vs. existing
  committee coverage and ranks candidates for **new committee formation**
  (`/admin/analytics`)

## Prerequisites

- Node.js 18+ and npm
- A MongoDB instance — either:
  - Local MongoDB (`mongodb://127.0.0.1:27017`), or
  - A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (recommended if you don't want to install MongoDB locally)

## 1. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and set:
- `MONGO_URI` — your MongoDB connection string
- `JWT_SECRET` — any long random string

Load demo data (creates sample committees, notices, events, winners, and a
fresher with interests so you can see recommendations working immediately):

```bash
npm run seed
```

This prints demo login credentials, e.g.:
```
Admin:            admin@srmscet.ac.in / admin123
Faculty Advisor:  saurabh.singh@srmscet.ac.in / faculty123
Committee Head:   @srmscet.ac.in / head123
Student/Fresher:  ishika@srmscet.ac.in / fresher123
```

Start the API:

```bash
npm run dev
```

The API runs on `http://localhost:5000` (health check: `GET /api/health`).

## 2. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api/*` requests
to the backend on port 5000 (see `vite.config.js`), so no extra config is
needed for local development.

## 3. Try it out

1. Log in as the seeded fresher (`ishika@srmscet.ac.in` / `fresher123`) —
   she's already onboarded with interests `ai, coding, robotics`, so visit
   **Committees** to see the Technical & Coding Club recommended first.
2. Register a **new** account as "I'm a Fresher" — you'll be routed straight
   into the onboarding interest/skill survey.
3. Log in as admin (`admin@srmscet.ac.in` / `admin123`) and open
   **Admin → Analytics** — with the seeded data, you'll see "photography"
   surface as a high-gap interest with zero existing committees, which is
   exactly the "should we start a Photography Club?" signal this feature is
   built to surface.
4. Log in as the committee head (`@srmscet.ac.in` / `head123`) and use
   **Post Notice** / **Post Event** in the navbar.

## Notes on scope & next steps

- **File uploads**: poster/logo/attachment fields currently take a URL
  (matches your original Cloudinary-based design) rather than a raw file
  upload widget — wire up `multer` + Cloudinary's SDK in `noticeRoutes.js` /
  `eventRoutes.js` if you want direct upload from the browser.
  `multer` is already listed in `backend/package.json`.
- **Email notifications** for followed committees aren't implemented yet —
  a good next addition using a service like Nodemailer or SendGrid.
- **Recommendation engine** is a transparent tag-overlap scorer
  (`backend/utils/matchScore.js`), not ML — intentionally simple, explainable,
  and free to run. It can be swapped for a more sophisticated model later
  without touching any other part of the app.
- Passwords are hashed with bcrypt; JWTs expire in 7 days by default
  (`JWT_EXPIRES_IN` in `.env`).
