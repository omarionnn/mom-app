# Mom App

A mobile application designed to connect mothers, expecting moms, and caregivers. This app facilitates building a supportive community by helping users find friends, join relevant groups, and chat with others who are in similar stages of life or share similar interests.

## Features

### 🌸 Discovery & Matching
- **Find Friends:** Discover other moms and caregivers based on shared interests, location, and children's ages.
- **Detailed Profiles:** creating profiles that highlight your "Season of Life," kids' ages, and personal interests to find compatible matches.

### 👥 Communities
- **Groups:** Join communities tailored to your needs.
  - **Season of Life:** Connect with others navigating the same parenting stages (e.g., "New Moms", "Toddlers").
  - **Interest Based:** Find groups for hobbies and passions.
  - **Local:** Discover parenting communities in your specific city or neighborhood.

### 💬 Messaging
- **Direct Messaging:** Chat 1-on-1 with your connections.
- **Group Chat:** Participate in lively discussions within your joined communities.

### 🔐 Secure & Private
- **Authentication:** Secure sign-up and login powered by Supabase.
- **Privacy Controls:** Manage profile visibility (Public, Matches Only, Private).

## Tech Stack

- **Framework:** [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Language:** TypeScript
- **Navigation:** React Navigation
- **Backend & Database:** [Supabase](https://supabase.com/) (Auth, PostgreSQL, Realtime)
- **Maps/Location:** Expo Location & Google Places API (if applicable)

## Installation & Setup

### Prerequisites
- Node.js and npm/yarn installed.
- Expo Go app on your mobile device (or a simulator installed on your computer).
- A Supabase project.

### Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/omarionnn/mom-app.git
   cd mom-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**

   **Step 1:** Copy the example environment file to create your own `.env`:
   ```bash
   cp .env.example .env
   ```

   **Step 2:** Open the `.env` file in a text editor:
   ```bash
   nano .env
   ```
   *(Or use `code .env` if you have VS Code, or `vim .env` for Vim)*

   **Step 3:** Replace the placeholder values with your actual API keys:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
   EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_api_key_here
   ```

   **Step 4:** Save and exit:
   - In **nano**: Press `Ctrl+O` to save, then `Ctrl+X` to exit
   - In **VS Code**: Press `Cmd+S` (Mac) or `Ctrl+S` (Windows/Linux)

   **Where to get your API keys:**
   | Key | Where to Find It |
   |-----|------------------|
   | `SUPABASE_URL` | [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Settings → API → Project URL |
   | `SUPABASE_ANON_KEY` | [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Settings → API → `anon` `public` key |
   | `GOOGLE_PLACES_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create Credentials → API Key (optional, for location features) |

4. **Database Setup:**
   - Run the SQL commands found in `supabase_schema.sql` in your Supabase project's SQL Editor to set up the necessary tables and policies.

5. **Run the App:**
   ```bash
   npm start
   ```
   - Scan the QR code with Expo Go (Android) or the Camera app (iOS) to run on your device.
   - Press `i` to run on an iOS simulator or `a` to run on an Android emulator.

## License

[MIT](LICENSE)
