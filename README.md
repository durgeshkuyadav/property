# Avya Home Private Limited — CRM System
### Real Estate Plot Management · Associate Network · Commission & Payout Engine
**Version 2.0 | All 7 Phases Complete | April 2026**

---

## Project Structure

```
avya-home/
├── backend/                        ← Node.js + Express API (port 5000)
│   ├── src/
│   │   ├── app.js                  ← Server entry point, all routes registered
│   │   ├── config/
│   │   │   ├── database.js         ← MySQL connection pool
│   │   │   └── schema.sql          ← All 10 tables + seed admin account
│   │   ├── controllers/
│   │   │   ├── authController.js        ← Login, OTP, profile
│   │   │   ├── associateController.js   ← Create/manage associates + downline tree
│   │   │   ├── projectController.js     ← Projects CRUD
│   │   │   ├── plotController.js        ← Plot inventory, bulk import, status
│   │   │   ├── customerController.js    ← Bookings, payments, monthly report
│   │   │   ├── payoutController.js      ← Commission calc, TDS, approval flow
│   │   │   └── pdfController.js         ← PDF generation endpoints
│   │   ├── middleware/
│   │   │   ├── auth.js             ← JWT authentication + role guards
│   │   │   ├── audit.js            ← Audit log every action
│   │   │   └── validators.js       ← express-validator input validation
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── associate.routes.js
│   │   │   ├── dashboard.routes.js
│   │   │   ├── project.routes.js
│   │   │   ├── plot.routes.js
│   │   │   ├── customer.routes.js
│   │   │   ├── payout.routes.js
│   │   │   └── pdf.routes.js
│   │   └── utils/
│   │       ├── jwt.js              ← Token generation + OTP
│   │       ├── response.js         ← Standard API response format
│   │       ├── helpers.js          ← Associate ID gen, payout code, TDS calc
│   │       ├── email.js            ← Welcome + OTP emails (nodemailer)
│   │       └── pdfGenerator.js     ← Branded PDF engine (pdfkit)
│   ├── package.json
│   └── .env                        ← Environment variables (edit this)
│
└── frontend/                       ← React 18 + Vite (port 3000)
    ├── src/
    │   ├── App.jsx                 ← All routes defined here
    │   ├── main.jsx
    │   ├── index.css               ← Navy/Gold design system
    │   ├── context/
    │   │   └── AuthContext.jsx     ← User state, isAdmin, isSuperAdmin
    │   ├── utils/
    │   │   └── api.js              ← Axios + authAPI, associateAPI, projectAPI,
    │   │                               plotAPI, customerAPI, payoutAPI, pdfAPI
    │   ├── components/layout/
    │   │   ├── Layout.jsx
    │   │   ├── Sidebar.jsx
    │   │   └── Topbar.jsx
    │   └── pages/
    │       ├── LoginPage.jsx
    │       ├── ForgotPasswordPage.jsx
    │       ├── DashboardPage.jsx
    │       ├── ProjectsPage.jsx
    │       ├── PlotStatusPage.jsx
    │       ├── CustomersPage.jsx          ← Bookings + payments + receipt PDF
    │       ├── MonthlyBusinessPage.jsx
    │       ├── PayoutDetailPage.jsx       ← Associate payout view + PDF download
    │       ├── PaymentsPage.jsx           ← Bank transfer records
    │       ├── ReferralTreePage.jsx
    │       ├── DownlinePage.jsx
    │       ├── ProfilePage.jsx
    │       ├── WelcomeLetterPage.jsx      ← Print + PDF download
    │       ├── ChangePasswordPage.jsx
    │       ├── AdminAssociatesPage.jsx
    │       ├── AdminProjectsPage.jsx
    │       ├── AdminPayoutsPage.jsx       ← Create, approve, mark paid
    │       └── PlaceholderPages.jsx       ← TeamPayoutPage (Phase 4 sprint 2)
    └── vite.config.js              ← Proxy /api → localhost:5000
```

---

## SETUP INSTRUCTIONS

### Step 1 — Install MySQL 8.0
Download: https://dev.mysql.com/downloads/mysql/
- Set a root password during install — you'll need it in Step 3.

### Step 2 — Create the Database
```bash
# Option A: Command line
mysql -u root -p < backend/src/config/schema.sql

# Option B: MySQL Workbench
# Open schema.sql and click Run
```
This creates the `avya_home_crm` database with all 10 tables and seeds the Super Admin account.

### Step 3 — Configure Backend
```bash
cd avya-home/backend
```
Edit the `.env` file — change these 3 values:
```env
DB_PASSWORD=your_mysql_root_password_here
JWT_SECRET=any_long_random_string_change_this
JWT_REFRESH_SECRET=another_long_random_string_here
```
Optional (for real OTP emails):
```env
SMTP_USER=yourcompany@gmail.com
SMTP_PASS=your_gmail_app_password
```

### Step 4 — Start Backend
```bash
cd avya-home/backend
npm install
npm run dev
```
Expected output:
```
✅ Database connected successfully
🏠 Avya Home CRM API running on port 5000
```

### Step 5 — Start Frontend
```bash
# New terminal window
cd avya-home/frontend
npm install
npm run dev
```
Open browser: **http://localhost:3000**

---

## Default Login

| Field    | Value          |
|----------|----------------|
| Mobile   | `9999999999`   |
| Password | `Admin@123`    |
| Role     | Super Admin    |

> ⚠️ Change this password immediately after first login via Profile → Change Password.

---

## All API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint              | Auth | Description                    |
|--------|-----------------------|------|--------------------------------|
| POST   | `/login`              | No   | Login → returns JWT tokens     |
| POST   | `/logout`             | Yes  | Revoke refresh token           |
| POST   | `/refresh-token`      | No   | Get new access token           |
| POST   | `/forgot-password`    | No   | Send OTP to mobile/email       |
| POST   | `/reset-password`     | No   | Verify OTP + set new password  |
| PUT    | `/change-password`    | Yes  | Change password (logged in)    |
| GET    | `/me`                 | Yes  | Get own profile                |
| PUT    | `/me`                 | Yes  | Update own profile             |

### Associates (`/api/associates`)
| Method | Endpoint                    | Role   | Description                  |
|--------|-----------------------------|--------|------------------------------|
| POST   | `/`                         | Admin  | Create associate (auto ID)   |
| GET    | `/`                         | Admin  | List all with search/filter  |
| GET    | `/:id`                      | Self+Admin | Get one associate       |
| PUT    | `/:id`                      | Admin  | Update associate             |
| PUT    | `/:id/reset-password`       | SuperAdmin | Force reset password    |
| GET    | `/downline`                 | Any    | Own flat downline list       |
| GET    | `/downline/tree`            | Any    | Own recursive tree           |
| GET    | `/:id/downline`             | Admin  | Any associate's downline     |

### Projects (`/api/projects`)
| Method | Endpoint  | Role  | Description            |
|--------|-----------|-------|------------------------|
| GET    | `/`       | Any   | List all projects      |
| GET    | `/:id`    | Any   | Get one project        |
| POST   | `/`       | Admin | Create project         |
| PUT    | `/:id`    | Admin | Update project         |
| DELETE | `/:id`    | Admin | Archive project        |

### Plots (`/api/plots`)
| Method | Endpoint             | Role  | Description                  |
|--------|----------------------|-------|------------------------------|
| GET    | `/`                  | Any   | List plots (all filters)     |
| GET    | `/summary`           | Any   | Count by status per project  |
| GET    | `/filter-options`    | Any   | Distinct categories/sizes    |
| GET    | `/:id`               | Any   | Get one plot                 |
| POST   | `/`                  | Admin | Create single plot           |
| POST   | `/bulk`              | Admin | Bulk import up to 500 plots  |
| PUT    | `/:id`               | Admin | Update plot details          |
| PATCH  | `/:id/status`        | Admin | Change plot status           |
| DELETE | `/:id`               | Admin | Delete plot                  |

### Customers (`/api/customers`)
| Method | Endpoint                          | Role       | Description              |
|--------|-----------------------------------|------------|--------------------------|
| GET    | `/`                               | Any        | List (admin=all, assoc=own) |
| GET    | `/monthly-business`               | Any        | Payment register report  |
| GET    | `/:id`                            | Any        | Get customer + payments  |
| POST   | `/`                               | Admin      | Book a plot              |
| PUT    | `/:id`                            | Admin      | Update customer details  |
| POST   | `/:id/cancel`                     | Admin      | Cancel booking           |
| GET    | `/:customer_id/payments`          | Any        | Get payment history      |
| POST   | `/:customer_id/payments`          | Admin      | Record payment           |
| PATCH  | `/:customer_id/payments/:pay_id`  | Admin      | Update payment status    |

### Payouts (`/api/payouts`)
| Method | Endpoint                | Role  | Description                        |
|--------|-------------------------|-------|------------------------------------|
| GET    | `/earnings`             | Any   | Own earnings dashboard             |
| GET    | `/transfers`            | Any   | Bank transfer records              |
| GET    | `/preview`              | Admin | Preview calc before creating       |
| GET    | `/`                     | Any   | List payouts (filtered by role)    |
| GET    | `/:id`                  | Any   | Get payout + breakdown             |
| POST   | `/`                     | Admin | Create payout (auto-calc TDS)      |
| PUT    | `/:id/approve`          | Admin | Approve payout                     |
| PUT    | `/:id/cancel`           | Admin | Cancel payout                      |
| POST   | `/:id/bank-transfer`    | Admin | Record bank transfer → mark Paid   |

### PDF Downloads (`/api/pdf`)
| Method | Endpoint                     | Role       | Output                         |
|--------|------------------------------|------------|--------------------------------|
| GET    | `/payout/:id/statement`      | Self+Admin | Payout statement PDF           |
| GET    | `/booking/:id/receipt`       | Self+Admin | Booking receipt PDF            |
| GET    | `/welcome-letter`            | Any        | Own welcome letter PDF         |
| GET    | `/welcome-letter/:id`        | Admin      | Any associate's welcome letter |

---

## Income & TDS Logic

### Self Income
```
Self Income = Total received payments (promoter = this associate) × commission_pct%
```

### Level Income (Direct Downline)
```
Level 1 Income = Total received payments by all direct downline × 2%
```

### TDS Deduction (Income Tax Act 1961)
| PAN Status        | Section | TDS Rate |
|-------------------|---------|----------|
| PAN Provided      | 194H    | 5%       |
| PAN Not Provided  | 206AA   | 20%      |

### Payout Workflow
```
Create Payout (auto-calc) → Approve → Record Bank Transfer → PAID
     ↓                           ↓                ↓
  pending                    approved             paid
```

---

## PDF Documents

All PDFs are generated server-side with company branding (Navy + Gold theme):

| PDF | How to get it | Contents |
|-----|---------------|----------|
| Payout Statement | Payout Detail page → ⬇ PDF | Income breakdown, TDS, net payable, customer payments, bank ref |
| Booking Receipt | Customers page → ⬇ Receipt | Plot details, all installments, balance due |
| Welcome Letter | Welcome Letter page → ⬇ Download PDF | Associate ID, joining date, benefits, company letter |

---

## Security Features

| Feature | Implementation |
|---------|----------------|
| Password hashing | bcrypt with 12 salt rounds |
| JWT Auth | Access token (24h) + Refresh token (7d) |
| Token revocation | Refresh tokens stored + revokable in DB |
| Rate limiting | 10 login attempts / 15 min; 5 OTPs / hour |
| Role-based access | 4 roles — super_admin, manager, associate, sub_associate |
| Data isolation | Associates only see own customers/payouts via SQL filters |
| Input validation | express-validator on all write endpoints |
| Audit log | Every create/update/delete recorded with user, timestamp, before/after |
| SQL injection | Parameterized queries throughout — no string interpolation in SQL |

---

## Development Tips

### OTP in development
OTP is printed in the backend console — no email config needed:
```
[OTP] Mobile: 9876543210 | OTP: 482910
```

### Check all running API routes
```bash
curl http://localhost:5000/health
```

### Test login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"mobile":"9999999999","password":"Admin@123"}'
```

### Create first associate
```bash
curl -X POST http://localhost:5000/api/associates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rajesh Kumar",
    "mobile": "9876543210",
    "password": "Test@1234",
    "commission_pct": 5,
    "role": "associate"
  }'
```

### Preview payout before creating
```bash
curl "http://localhost:5000/api/payouts/preview?associate_id=2&from_date=2026-04-01&to_date=2026-04-30" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Common Issues & Fixes

| Problem | Fix |
|---------|-----|
| `Database connection failed` | Check MySQL running, DB_PASSWORD in .env correct, schema.sql executed |
| `Cannot GET /api/...` | Backend must be on port 5000, check `npm run dev` output |
| Frontend blank screen | Check browser console; both backend + frontend must be running |
| OTP not received | In dev mode, check backend terminal for `[OTP]` log line |
| PDF download fails | Check pdfkit installed: `npm list pdfkit` in backend folder |
| `Token expired` | Frontend auto-refreshes; if persistent, clear localStorage and re-login |

---

## What's Built (All 7 Phases Complete)

- [x] **Phase 1** — Auth: JWT login, OTP forgot-password, refresh tokens, 4 roles, audit log
- [x] **Phase 2** — Projects & Plots: CRUD, bulk import (500/batch), category filters, status grid
- [x] **Phase 3** — Customers & Payments: KYC, booking, RTGS/NEFT/Cheque/Cash, balance tracking, monthly report
- [x] **Phase 4** — Payouts: Auto self + level income, TDS (5%/20%), approval workflow, bank transfer recording
- [x] **Phase 5** — Network: Unlimited depth referral tree, flat downline table, network stats
- [x] **Phase 6** — Admin Panel: Associates, projects, payout processing — all with full CRUD
- [x] **Phase 7** — PDFs: Payout statement, booking receipt, welcome letter — all branded, downloadable

"# property" 
