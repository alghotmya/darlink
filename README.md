# DarLink — Phase 1 MVP

Real estate marketplace for **UAE, GCC and Egypt** (rent/lease + buy/sell). Multi-tenant, REST API, no tokenization.

## Repo structure

```
Darlink/
├── .env.example          # Copy to .env — AWS keys, Cognito, API URL, optional Git token
├── .gitignore
├── amplify.yml           # Amplify Hosting build spec
├── amplify-rewrites.json # SPA redirect rule (paste into Amplify Console)
├── package.json          # Root scripts (install:all, dev, backend:deploy, etc.)
├── backend/
│   ├── bin/app.ts        # CDK app entry
│   ├── lib/
│   │   ├── darlink-stack.ts   # Cognito, DynamoDB, S3, API Gateway, Lambdas
│   │   └── entities.ts        # Domain types + DynamoDB key patterns (UAE/GCC/Egypt)
│   ├── lambdas/          # API handlers (public listings, public lead, me)
│   ├── scripts/seed-data.ts
│   ├── cdk.json
│   └── package.json
└── frontend/             # React (Vite + TypeScript)
    ├── src/
    │   ├── App.tsx, main.tsx
    │   ├── components/, pages/, lib/
    │   └── index.css
    ├── .env.example      # VITE_API_BASE_URL (set after deploy)
    └── package.json
```

## Prerequisites

- Node.js 18+
- AWS CLI configured (for deploy)
- Git (for local repo and later push)

## 1) Local Git repo

From project root:

```bash
cd /Users/ahmedalghotmy/Documents/projects/Darlink
git init
git add .
git commit -m "Initial DarLink Phase 1 — UAE/GCC/Egypt, REST, React, CDK"
```

To push to a remote later:

```bash
git remote add origin <your-remote-url>
git branch -M main
git push -u origin main
```

## 2) Environment (.env)

Copy the example and fill in what you need:

```bash
cp .env.example .env
```

- **AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION** — for `cdk deploy` and seed script.
- **COGNITO_USER_POOL_ID / COGNITO_CLIENT_ID** — from CDK output after first deploy; use when wiring auth in the app.
- **VITE_API_BASE_URL** — from CDK output (API URL); set in **frontend** for local dev or use frontend `.env` (see below).
- **ADMIN_API_KEY** — optional; if set, admin listing endpoints require header `x-admin-key: <value>` or `Authorization: Bearer <value>`.
- **GIT_TOKEN / GITHUB_TOKEN** — optional (e.g. CI or scripts).

**Frontend:** copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_BASE_URL` to your API Gateway URL after deploy. Do not commit `.env` (already in `.gitignore`).

## 3) Install and run locally

**Install all:**

```bash
npm run install:all
```

**Install Lambda deps (needed for deploy):**

```bash
cd backend/lambdas/public-listings && npm install && cd ../..
cd backend/lambdas/public-lead && npm install && cd ../..
```

**Run locally:**

```bash
npm run dev:api    # terminal 1 — local API (port 3000)
npm run dev        # terminal 2 — frontend
```

Then open [http://localhost:5173](http://localhost:5173). The app works locally; listing data appears after you deploy the backend and run the seed script (or point `VITE_API_BASE_URL` to a deployed API).

## 4) Deploy backend (AWS)

From project root, with AWS credentials and region set (e.g. via `.env` or `export`):

```bash
cd backend
npm install
npx cdk bootstrap   # once per account/region
npx cdk deploy --context env=dev
```

Note the outputs: **ApiUrl**, **UserPoolId**, **UserPoolClientId**, **TableName**, **BucketName**.

**Seed data:**

```bash
export TABLE_NAME=<TableName from output>
node -e "require('dotenv').config(); require('@aws-sdk/client-dynamodb');" 2>/dev/null || true
npm install dotenv
TABLE_NAME=<TableName> npx ts-node scripts/seed-data.ts
```

Or with AWS profile:

```bash
AWS_PROFILE=yourprofile TABLE_NAME=darlink-dev-data npx ts-node scripts/seed-data.ts
```

## 5) Point frontend to your API

In `frontend/.env`:

```
VITE_API_BASE_URL=https://xxxxxxxxxx.execute-api.me-south-1.amazonaws.com/prod/
```

Restart `npm run dev` and browse listings; submit a lead from a listing detail page.

## 6) Deploy frontend to AWS Amplify

1. **Deploy the backend first** (section 4) and note the **ApiUrl** (e.g. `https://xxxx.execute-api.REGION.amazonaws.com/prod/`).

2. **Connect the repo** to Amplify Hosting (App settings > General > Repository).

3. **Build settings** — Amplify uses the repo’s `amplify.yml`. Ensure the app root is the repo root and the frontend lives in `frontend/`.

4. **Environment variables** (Amplify Console → App settings → Environment variables):
   - Add **VITE_API_BASE_URL** = your API URL including the stage, e.g. `https://xxxx.execute-api.REGION.amazonaws.com/prod/`  
   This is inlined at build time so the hosted app calls your API Gateway.

5. **SPA rewrites** (so `/listings` and other routes serve `index.html`):
   - In Amplify: **Hosting** → **Rewrites and redirects** → **Manage redirects**.
   - Paste the contents of **amplify-rewrites.json** (one rule: `/<*>` → `/index.html` with status 200).

6. Save and redeploy. The Amplify URL will load the app and “Browse listings” will call your deployed API.

## Database entities (DynamoDB)

- **Organization** — orgId, name, type (landlord / brokerage / property_manager), countryCode, region (UAE/GCC/Egypt).
- **User** — userId, org membership, roles.
- **Listing** — listingId, orgId, status, type (rent/sale), title, description, price, currency, countryCode, region, city, area, address, lat, lng, bedrooms, bathrooms, areaSqm, **mediaKeys** (S3 keys for property pictures), createdAt, updatedAt, publishedAt.
- **Lead** — leadId, listingId, orgId, contact info, status.
- **Application** — applicationId, listingId, orgId, applicant, docs, status.
- **Offer / Contract** — placeholders with status.
- **AuditLog** — append-only by org and time.
- **Invite** — orgId, email, role, status, expiresAt.

Single-table design; key patterns and GSIs in `backend/lib/entities.ts`.

## API (REST)

- **Public:** `GET /public/listings`, `GET /public/listings/{id}`, `POST /public/listings/{id}/leads`.
- **Auth (placeholder):** `GET /me`.
- **Admin (org listings CRUD):** require `x-admin-key` or `Authorization: Bearer <ADMIN_API_KEY>` if `ADMIN_API_KEY` is set.
  - `GET /orgs/{orgId}/listings` — list listings (optional `?status=draft|published|paused|archived`, `?limit=50`).
  - `POST /orgs/{orgId}/listings` — create listing (body: title, description, price, currency, countryCode, type, status, city, area, bedrooms, bathrooms, areaSqm, mediaKeys, etc.).
  - `GET /orgs/{orgId}/listings/{listingId}` — get one listing.
  - `PUT /orgs/{orgId}/listings/{listingId}` — update listing (same body as create; include mediaKeys after uploading images).
  - `DELETE /orgs/{orgId}/listings/{listingId}` — delete listing.
  - `POST /orgs/{orgId}/listings/{listingId}/media/presign` — get presigned URL to upload a property picture (body: `{ "fileName": "photo.jpg", "contentType": "image/jpeg" }`). Returns `{ uploadUrl, key }`. Upload with PUT to `uploadUrl`, then add `key` to the listing’s `mediaKeys` via PUT listing.

Monetization and agents are out of MVP; infrastructure is ready to add org-scoped and authenticated endpoints later.

## TODO / Phase 2

- [ ] Cognito authorizer on API Gateway and `/me` implementation.
- [ ] Org-scoped endpoints (listings CRUD, leads inbox, audit).
- [ ] Agent/broker flows and optional agentId on listings.
- [ ] Monetization placeholders.
- [x] Amplify host for frontend (see section 6).
