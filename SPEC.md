# SlipSync - Thai Bank Slip Finance Tracker

## Overview
A web application for tracking personal finances by scanning Thai bank slips (สลิป) using QR codes and OCR.

## Tech Stack
- **Frontend:** Next.js 14 (App Router) - Cloudflare Pages
- **Backend:** Hono.js (Cloudflare Workers)
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare R2
- **Auth:** Google OAuth + Email/Password
- **QR/OCR:** qr-scanner + tesseract.js

## Features
1. **User Authentication**
   - Google OAuth login
   - Email/Password login
   - Session management

2. **Slip Scanning**
   - Upload image from mobile
   - QR code detection (PromptPay, bank QR)
   - OCR for text extraction (amount, name, date)
   - Support all Thai banks

3. **Transaction Management**
   - Add transactions manually
   - Import from slip images
   - Categorize transactions
   - View transaction history

4. **Dashboard**
   - Monthly summary
   - Income/Expense breakdown
   - Balance tracking

## Supported Thai Banks
- KBank (K+)
- SCB
- TrueMoney Wallet
- Krungthai Bank
- Bangkok Bank (BBL)
- TMB Bank
- Kasikorn Bank (KBank)
- All PromptPay-enabled banks

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Mobile    │────▶│  Next.js    │────▶│   Hono     │
│   Browser   │     │  (Pages)    │     │  Workers   │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
              ┌─────▼─────┐            ┌─────▼─────┐            ┌─────▼─────┐
              │    R2     │            │    D1     │            │  Google   │
              │  Storage  │            │ Database  │            │   Auth    │
              └───────────┘            └───────────┘            └───────────┘
```

## Database Schema (D1)

### users
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | User ID (UUID) |
| email | TEXT | User email |
| name | TEXT | Display name |
| google_id | TEXT | Google OAuth ID |
| created_at | TEXT | ISO timestamp |

### transactions
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Transaction ID (UUID) |
| user_id | TEXT | Owner user ID |
| amount | REAL | Transaction amount (THB) |
| type | TEXT | 'income' or 'expense' |
| source | TEXT | Bank name |
| sender_name | TEXT | Sender/receiver name |
| note | TEXT | Optional note |
| slip_url | TEXT | R2 URL to slip image |
| transaction_date | TEXT | Transaction date |
| created_at | TEXT | ISO timestamp |

### categories
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Category ID |
| name | TEXT | Category name |
| icon | TEXT | Emoji icon |
| color | TEXT | Hex color |

## API Endpoints

### Auth
- `POST /api/auth/register` - Register with email
- `POST /api/auth/login` - Login with email
- `GET /api/auth/google` - Google OAuth login
- `POST /api/auth/logout` - Logout

### Transactions
- `GET /api/transactions` - List user transactions
- `POST /api/transactions` - Create transaction
- `GET /api/transactions/:id` - Get transaction detail
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Upload
- `POST /api/upload/slip` - Upload slip image and extract data
- `GET /api/upload/presigned-url` - Get R2 presigned URL

## Cloudflare Setup Required

1. **D1 Database**
   ```bash
   wrangler d1 create slipsync
   wrangler d1 execute slipsync --file=./schema.sql
   ```

2. **R2 Bucket**
   ```bash
   wrangler r2 bucket create slipsync
   ```

3. **Pages Project**
   - Connect to GitHub repo
   - Set build command: `npm run build`
   - Set build output: `.next`

4. **Environment Variables**
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `AUTH_SECRET`
   - `D1_DATABASE_ID`
   - `R2_BUCKET_NAME`

## Local Development

```bash
# Install dependencies
npm install

# Setup D1 local
wrangler d1 local create slipsync
wrangler d1 execute slipsync --local --file=./schema.sql

# Run dev server
npm run dev
```

## License
MIT
