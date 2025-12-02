# Indigo Yield Platform

> Multi-platform investment management system featuring a comprehensive Web Dashboard and native iOS Application.

## 🏗️ Project Structure

The project is organized as follows:

```
indigo-yield-platform-v01/
├── src/                  # Web Application (React + TypeScript + Vite)
├── public/               # Static assets for Web
├── supabase/             # Database migrations and Edge Functions
├── ios/                  # Native iOS Application (SwiftUI)
├── docs/                 # Project documentation
├── tests/                # Unit and Integration tests
├── package.json          # Web dependencies and scripts
└── README.md             # This file
```

## 🚀 Quick Start (Web)

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Set Up Environment:**
    Copy `.env.example` to `.env` and configure your Supabase credentials.
    ```bash
    cp .env.example .env
    ```

3.  **Run Development Server:**
    ```bash
    npm run dev
    ```

4.  **Build for Production:**
    ```bash
    npm run build
    ```

## 📱 iOS Application

The iOS application is located in the `ios/` directory.

```bash
cd ios
pod install  # If using CocoaPods
open IndigoInvestor.xcworkspace
```

See [ios/README.md](ios/README.md) for detailed iOS build instructions.

## 🛠️ Core Features

-   **Monthly Reporting:** Admins enter monthly performance data; investors receive generated PDF/HTML reports.
-   **Asset Management:** Support for BTC, ETH, SOL, USDC, USDT, and EURC.
-   **Role-Based Access:** Secure Admin Portal and Investor Dashboard.
-   **Notifications:** Email tracking and real-time alerts.

## 🔐 Database & Migration

This project uses **Supabase** (PostgreSQL).

**Important:** If you are setting this up for the first time or deploying updates, please refer to **`FINAL_MIGRATION_SUMMARY.md`** for the critical SQL scripts required to configure the database schema and security policies.

## 🧪 Testing

-   **Unit Tests:** `npm run test:unit`
-   **E2E Tests:** `npm run test:e2e`
-   **Service Health:** `npm run check:services`

## 📄 License

Proprietary - All rights reserved.