# Happy Bar Mobile App

A professional React Native mobile app for inventory management with Better-auth integration.

## Setup

1. **Environment Configuration**
   Create a `.env` file in the mobile app directory:
   ```
   EXPO_PUBLIC_API_URL=http://localhost:3001
   EXPO_PUBLIC_DEV_MODE=true
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Generate Native Projects**
   ```bash
   pnpm prebuild
   ```

4. **Run the App**
   ```bash
   pnpm android  # For Android
   pnpm ios      # For iOS
   ```

## Authentication

The app uses Better-auth to authenticate against the Happy Bar backend API at `packages/api`. 

- Users login with email/password
- No registration flow (users must be created via backend/admin)
- Sessions are managed by Better-auth with secure token handling
- Offline user data cached in AsyncStorage

## Features

- 🔐 **Better-auth Integration**: Secure authentication with your backend
- 📊 **Dashboard**: Real-time inventory metrics and alerts
- 📱 **Mobile-First Design**: Optimized for touch interaction
- 🎯 **Quick Actions**: Fast inventory counting and management
- 🎨 **Brand Consistent**: Happy Bar purple/amber color scheme
- 📶 **Offline Support**: Cached user data for offline access

## Development

- Built with Expo SDK 53
- React Native 0.79.6
- TypeScript for type safety
- Zustand for state management
- React Query for API caching
- React Navigation for routing