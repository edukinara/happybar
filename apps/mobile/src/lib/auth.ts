import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Get the API URL from environment or use localhost for development
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

// Debug wrapper for SecureStore to understand iOS issues
const debugSecureStore = {
  async setItemAsync(key: string, value: string) {
    try {
      console.log(`🔍 SecureStore SET (${Platform.OS}):`, { key, valueLength: value.length });
      const result = await SecureStore.setItemAsync(key, value);
      console.log(`✅ SecureStore SET success (${Platform.OS}):`, key);
      return result;
    } catch (error) {
      console.error(`❌ SecureStore SET error (${Platform.OS}):`, { key, error });
      throw error;
    }
  },

  async getItemAsync(key: string) {
    try {
      console.log(`🔍 SecureStore GET (${Platform.OS}):`, key);
      const result = await SecureStore.getItemAsync(key);
      console.log(`${result ? '✅' : '⚠️'} SecureStore GET result (${Platform.OS}):`, { 
        key, 
        hasValue: !!result,
        valueLength: result?.length || 0 
      });
      return result;
    } catch (error) {
      console.error(`❌ SecureStore GET error (${Platform.OS}):`, { key, error });
      return null;
    }
  },

  async deleteItemAsync(key: string) {
    try {
      console.log(`🔍 SecureStore DELETE (${Platform.OS}):`, key);
      const result = await SecureStore.deleteItemAsync(key);
      console.log(`✅ SecureStore DELETE success (${Platform.OS}):`, key);
      return result;
    } catch (error) {
      console.error(`❌ SecureStore DELETE error (${Platform.OS}):`, { key, error });
      throw error;
    }
  },

  // Add the missing methods that Better-auth expects
  setItem: function(key: string, value: string) {
    return this.setItemAsync(key, value);
  },

  getItem: function(key: string) {
    return this.getItemAsync(key);
  },

  removeItem: function(key: string) {
    return this.deleteItemAsync(key);
  }
};

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