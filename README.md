# ⛳ Golf Charity App

A **production-grade web platform** built with **Next.js 15**, **Supabase**, and **Mantine UI** that enables golfers to submit scores, support charities, and participate in a **monthly prize draw** powered by their *Rolling 5* verified scores.

---

## ✨ Key Highlights

- 🎯 Skill-based prize system using real golf scores  
- ❤️ Charity contribution model (50/50 split)  
- 🔐 Secure role-based access (User & Admin)  
- ⚡ Modern full-stack architecture  
- 💳 Razorpay integration with test mode  

---

## 🚀 Features

### 👤 User Experience

- **Authentication**  
  Secure login/signup with Supabase Auth (email verification enabled)

- **Rolling 5 Scores**  
  Automatically maintains the latest 5 scores

- **Score Verification**  
  Upload scorecard images for admin approval

- **Charity Selection**  
  Choose preferred charity via dynamic picker

- **Winnings Dashboard**  
  Track prize earnings and payout status

- **Subscription System**  
  Razorpay integration with:
  - Live payments  
  - Dummy/Test mode  

---

### 🛠️ Admin Dashboard

- **User Management**  
  Monitor users and subscriptions  

- **Verification Queue**  
  Approve/reject submitted scorecards  

- **🎲 Draw Engine**
  - Random number generation (1–45)  
  - Simulation mode (dry runs)  
  - Prize calculation & distribution  
  - Winner recording  

- **📊 Analytics**
  - Total users  
  - Prize pool tracking  
  - Charity contributions  

- **🏆 Winner Management**  
  Track winners and mark payouts  

---

## 🧭 Route Directory & Navigation

Some routes (like Admin panels) are hidden from UI navigation.  
You can access them directly via URL:

---

### 👤 Player Routes

| Page        | Path            | Description                         | Access        |
|-------------|----------------|-------------------------------------|--------------|
| Root        | `/`            | Redirect to Dashboard/Login         | Public       |
| Login       | `/auth/login`  | User login                          | Public       |
| Sign Up     | `/auth/signup` | Register account                    | Public       |
| Dashboard   | `/dashboard`   | Scores, charities, winnings         | Auth Required|
| Membership  | `/subscribe`   | Subscription checkout               | Auth Required|

---

### 🛠️ Admin Routes

| Page            | Path    | Description                                              | Access     |
|-----------------|---------|----------------------------------------------------------|-----------|
| Admin Dashboard | `/admin` | Unified hub for verification, draws, users, and winners. | Admin Only|

---

### ⚙️ API Routes

| Endpoint        | Path                  | Purpose                          | Method |
|-----------------|-----------------------|----------------------------------|--------|
| Auth Callback   | `/auth/callback`      | Supabase auth handler            | GET    |
| Checkout API    | `/api/checkout`       | Create subscription              | POST   |
| Webhook API     | `/api/webhook`        | Handle Razorpay events           | POST   |
| Demo Payment    | `/api/dummy-checkout` | Test payment flow                | POST   |

---

> ⚠️ **Note:**  
> Admin access requires `is_admin = true` in the Supabase `profiles` table.

---

## 🛠 Tech Stack

| Layer        | Technology |
|-------------|-----------|
| Framework   | Next.js 15 (App Router) |
| UI          | Mantine UI v7, Tailwind CSS, Lucide Icons |
| Backend     | Supabase (PostgreSQL, RLS, Storage, RPC) |
| Payments    | Razorpay (SDK + Webhooks) |
| Language    | TypeScript |

---

## 📂 Project Structure
golf-charity-app/
├── app/
│ ├── admin/
│ ├── api/
│ ├── auth/
│ ├── dashboard/
│ └── subscribe/
├── components/
├── lib/
└── public/


---

## ⚙️ Setup Guide

### 1. Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
RAZORPAY_PLAN_ID=your_plan_id
