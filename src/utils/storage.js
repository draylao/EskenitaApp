import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const isWebPlatform = Platform.OS === "web";

const webStorage = {
  getItem: async (key) => {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  },
  setItem: async (key, value) => {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  },
  removeItem: async (key) => {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.removeItem(key);
  },
};

export const storage = {
  getItem: async (key) => {
    try {
      if (isWebPlatform) {
        return await webStorage.getItem(key);
      }
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      if (isWebPlatform) {
        await webStorage.setItem(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch {
      // Ignore storage failures so onboarding can continue gracefully.
    }
  },
  removeItem: async (key) => {
    try {
      if (isWebPlatform) {
        await webStorage.removeItem(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch {
      // Ignore storage failures so onboarding can continue gracefully.
    }
  },
};
