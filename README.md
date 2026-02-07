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
   Copy the example environment file and add your credentials:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your API keys:
   - **Supabase** credentials from [supabase.com/dashboard](https://supabase.com/dashboard) → Project Settings → API
   - **Google Places API** key from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (optional, for location features)

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
