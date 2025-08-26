import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

// Get the API URL from environment or use localhost for development
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: {
    credentials: 'omit',
  },
  plugins: [
    expoClient({
      scheme: "happybar",
      storagePrefix: "happybar",
      storage: SecureStore,
    }),
  ],
});

export type Session = typeof authClient.$Infer.Session;