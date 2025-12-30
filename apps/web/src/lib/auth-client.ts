import { createAuthClient } from "better-auth/react";

// Check if running in Tauri (works even before __TAURI__ is injected)
function isTauriEnvironment(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  // Check URL protocol - Tauri uses tauri:// or https://tauri.localhost
  const protocol = window.location.protocol;
  return (
    protocol === "tauri:" || window.location.hostname === "tauri.localhost"
  );
}

// Stub auth client for desktop mode (auth is bypassed)
const stubAuthClient = {
  useSession: () => ({ data: null, isPending: false }),
  signIn: {
    email: async () => ({ error: new Error("Auth disabled in desktop mode") }),
  },
  signUp: {
    email: async () => ({ error: new Error("Auth disabled in desktop mode") }),
  },
  signOut: async () => {
    // No-op for stub auth client in desktop mode
  },
};

// Create auth client - only used in web mode (not desktop)
// Desktop mode uses stub to avoid "Invalid base URL: tauri://localhost" error
function createClient() {
  if (isTauriEnvironment()) {
    return stubAuthClient as unknown as ReturnType<typeof createAuthClient>;
  }
  return createAuthClient({});
}

export const authClient = createClient();
