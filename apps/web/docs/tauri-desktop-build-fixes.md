# Tauri Desktop Build Fixes

## Problem Statement

The application worked correctly in development mode (`bun run desktop:dev:cuda`) but failed when built for production (`bun run desktop:build:cuda`). When launching the built AppImage, the error displayed was:

```
Application error: a client-side exception has occurred while loading localhost
```

After adding an ErrorBoundary, the actual error was revealed:

```
Invalid base URL: tauri://localhost. URL must include 'http://' or 'https://'
```

---

## Root Causes Identified

### 1. Static Export Not Configured

**Problem**: Next.js was producing an SSR (Server-Side Rendering) bundle in `.next/` directory, but Tauri requires static HTML files with an `index.html` entry point.

**Why it matters**: Tauri's webview loads static files directly. Without `output: "export"`, Next.js generates server-side code that requires a Node.js runtime, which doesn't exist in the Tauri context.

### 2. Server-Only Routes Incompatible with Static Export

**Problem**: Routes using server-only features (`headers()`, API routes) cannot be statically exported:
- `/api/auth/[...all]` - Better Auth API routes
- `/api/trpc/[trpc]` - tRPC API routes
- `/dashboard` - Uses `headers()` for server-side auth
- `/login` - Auth-related page

**Why it matters**: Static export pre-renders all pages at build time. Dynamic server features like `headers()` require a running server.

### 3. TypeScript Including Tauri Build Artifacts

**Problem**: The `tsconfig.json` included pattern `./**/*.ts` which matched binary files in `src-tauri/target/` that Tauri generates with `.ts` extensions.

**Why it matters**: TypeScript tried to parse binary codegen files as TypeScript, causing build failures.

### 4. Auth Client Using Invalid Base URL

**Problem**: The `better-auth` client used `window.location` to construct its base URL. In Tauri production builds, this is `tauri://localhost`, which isn't a valid HTTP URL.

**Why it matters**: The auth client initialization failed immediately on page load, crashing the entire app.

### 5. Tauri API Imports at Module Load Time

**Problem**: The `KalosmAdapter` imported `@tauri-apps/api/core` at the top of the module. During SSR/hydration, these imports could fail or cause issues.

**Why it matters**: Module-level imports execute immediately when the file is loaded, before the Tauri runtime is fully initialized.

### 6. Stale Build Artifacts

**Problem**: Previous dev runs left type validator files in `dist/` that referenced routes we were excluding during the build.

**Why it matters**: TypeScript found references to non-existent files and failed compilation.

---

## Fixes Applied

### Fix 1: Conditional Static Export Configuration

**File**: `apps/web/next.config.ts`

```typescript
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const isTauri = !!process.env.TAURI_ENV_PLATFORM;

const nextConfig: NextConfig = {
  typedRoutes: !isTauri,  // Disable typed routes for Tauri (excluded routes cause errors)
  reactCompiler: true,
  ...(isTauri && {
    output: "export",      // Static HTML export for Tauri
    distDir: "dist",       // Output to dist/ instead of .next/
    images: {
      unoptimized: true,   // Required for static export
    },
  }),
};

export default nextConfig;

if (!isTauri) {
  initOpenNextCloudflareForDev();
}
```

**How it works**: Tauri sets `TAURI_ENV_PLATFORM` environment variable during builds. When detected, Next.js is configured for static export. Otherwise, it uses the normal SSR configuration for Cloudflare deployment.

---

### Fix 2: Update Tauri Frontend Distribution Path

**File**: `apps/web/src-tauri/tauri.conf.json`

```json
{
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:3001",
    "beforeDevCommand": "bun run dev",
    "beforeBuildCommand": "node scripts/build-desktop.mjs"
  }
}
```

**Changes**:
- `frontendDist`: Changed from `../.next` to `../dist` to match the static export output directory
- `beforeBuildCommand`: Changed from `bun run build` to `node scripts/build-desktop.mjs` to use the custom build script

---

### Fix 3: Exclude src-tauri from TypeScript

**File**: `apps/web/tsconfig.json`

```json
{
  "exclude": ["./node_modules", "./src-tauri"]
}
```

**Why**: Prevents TypeScript from trying to parse Tauri's Rust build artifacts that have `.ts` extensions but contain binary data.

---

### Fix 4: Desktop Build Script with Route Exclusion

**File**: `apps/web/scripts/build-desktop.mjs`

```javascript
#!/usr/bin/env node

/**
 * Build script for Tauri desktop - excludes server-only routes incompatible with static export
 * Desktop mode bypasses auth, so auth-related routes are also excluded
 * Cross-platform: works on Linux, macOS, and Windows
 */

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmdirSync, rmSync } from "node:fs";
import { basename, join } from "node:path";

const BACKUP_DIR = ".desktop-build-backup";

// Routes to exclude from static export (server-side auth, API routes)
const EXCLUDED_ROUTES = ["src/app/api", "src/app/dashboard", "src/app/login"];

// Auth components only used by excluded routes
const EXCLUDED_COMPONENTS = [
  "src/components/sign-in-form.tsx",
  "src/components/sign-up-form.tsx",
];

// ... helper functions for backup/restore and build execution

async function main() {
  cleanBuildArtifacts();
  mkdirSync(BACKUP_DIR, { recursive: true });

  // Move excluded routes and components to backup
  for (const route of EXCLUDED_ROUTES) moveToBackup(route, true);
  for (const component of EXCLUDED_COMPONENTS) moveToBackup(component, false);

  // Run the Next.js build
  const exitCode = await runBuild();

  // Restore all files
  for (const route of EXCLUDED_ROUTES) restoreFromBackup(route);
  for (const component of EXCLUDED_COMPONENTS) restoreFromBackup(component);

  try { rmdirSync(BACKUP_DIR); } catch { /* ignore */ }
  console.log("Routes restored");
  process.exit(exitCode);
}

main();
```

**How it works**:
1. Cleans previous build artifacts to avoid stale type references
2. Temporarily moves server-only routes and components to a backup directory
3. Runs the Next.js build (which now succeeds without server-only code)
4. Restores all files so web development continues to work

---

### Fix 5: Tauri-Aware Auth Client

**File**: `apps/web/src/lib/auth-client.ts`

```typescript
import { createAuthClient } from "better-auth/react";

// Check if running in Tauri (works even before __TAURI__ is injected)
function isTauriEnvironment(): boolean {
  if (typeof window === "undefined") return false;
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
  signOut: async () => {},
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
```

**Key insight**: We detect Tauri by checking `window.location.protocol === "tauri:"` instead of checking for `__TAURI__` global. This works because:
- The URL protocol is available immediately when the page loads
- `__TAURI__` may not be injected yet during early module initialization
- The auth client is initialized at module load time, before React hydration

---

### Fix 6: Safe Desktop Detection Hook

**File**: `packages/platform/src/use-is-desktop.ts`

```typescript
"use client";

import { useEffect, useState } from "react";
import { isDesktop } from "./capabilities";

/**
 * React hook for safe desktop detection
 * Returns undefined during SSR/initial render to prevent hydration mismatch
 * Returns true/false after mount when platform detection is complete
 */
export function useIsDesktop(): boolean | undefined {
  const [isDesktopApp, setIsDesktopApp] = useState<boolean | undefined>(
    undefined,
  );

  useEffect(() => {
    setIsDesktopApp(isDesktop());
  }, []);

  return isDesktopApp;
}
```

**Why**: Direct calls to `isDesktop()` during render cause hydration mismatches (server returns `false`, client might return `true`). This hook safely defers the check to after mount.

---

### Fix 7: Desktop-Aware Home Page

**File**: `apps/web/src/app/page.tsx`

```typescript
"use client";
import { useIsDesktop } from "@continuum/platform";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

export default function Home() {
  const isDesktopApp = useIsDesktop();

  // Skip API health check in desktop mode (no backend available)
  const healthCheck = useQuery({
    ...trpc.healthCheck.queryOptions(),
    enabled: isDesktopApp === false,  // Only run in web mode
  });

  // Show green for desktop mode or when connected
  const isHealthy = isDesktopApp || healthCheck.data;

  // ... rest of component
}
```

**Why**: The health check calls `/api/trpc` which doesn't exist in the static export. Disabling it in desktop mode prevents failed fetch attempts.

---

### Fix 8: Desktop-Aware User Menu

**File**: `apps/web/src/components/user-menu.tsx`

```typescript
"use client";

import { useIsDesktop } from "@continuum/platform";
// ... other imports

function WebUserMenu() {
  // Full auth menu for web mode
  const { data: session, isPending } = authClient.useSession();
  // ... auth logic
}

export default function UserMenu() {
  const isDesktopApp = useIsDesktop();

  // Show skeleton during initialization to prevent hydration mismatch
  if (isDesktopApp === undefined) {
    return <Skeleton className="h-9 w-24" />;
  }

  // Desktop mode: auth is bypassed, show local user indicator
  if (isDesktopApp) {
    return (
      <Button disabled variant="outline">
        Local User
      </Button>
    );
  }

  // Web mode: full auth flow
  return <WebUserMenu />;
}
```

**Why**: In desktop mode, auth is bypassed entirely. This prevents the auth client from being called and shows a simple "Local User" indicator instead.

---

### Fix 9: Lazy Inference Adapter Loading

**File**: `apps/web/src/lib/inference/get-adapter.ts`

```typescript
export async function getInferenceAdapterAsync(): Promise<InferenceAdapter> {
  if (cachedAdapter && !(cachedAdapter instanceof StubAdapter && isDesktop())) {
    return cachedAdapter;
  }

  if (isDesktop()) {
    // Dynamic import to avoid loading @tauri-apps/api at module load time
    const { KalosmAdapter } = await import("@continuum/inference");
    cachedAdapter = new KalosmAdapter();
  } else {
    cachedAdapter = new StubAdapter();
  }

  return cachedAdapter;
}
```

**File**: `apps/web/src/components/features/chat/chat-panel.tsx`

```typescript
const handleSendMessage = useCallback(async (content: string) => {
  // ... setup code

  // Dynamic import to avoid loading @tauri-apps/api at module load time
  const { getInferenceAdapterAsync } = await import(
    "@/lib/inference/get-adapter"
  );
  const adapter = await getInferenceAdapterAsync();

  // ... rest of message handling
}, []);
```

**Why**: The `@tauri-apps/api` package must only be loaded when actually needed (when sending a message), not at module initialization time. Dynamic imports ensure the Tauri runtime is fully available before the API is used.

---

### Fix 10: Error Boundary for Debugging

**File**: `apps/web/src/components/error-boundary.tsx`

```typescript
"use client";

import { Component, type ReactNode } from "react";

export class ErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-100 p-4 text-red-900">
          <h1 className="font-bold text-xl">Something went wrong</h1>
          <pre className="mt-2 whitespace-pre-wrap text-sm">
            {this.state.error?.message}
          </pre>
          <pre className="mt-2 whitespace-pre-wrap text-xs">
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Why**: The default Next.js error message ("client-side exception has occurred") is unhelpful. This ErrorBoundary displays the actual error message and stack trace, which was crucial for identifying the `tauri://localhost` URL issue.

---

## Summary of Modified Files

| File | Change |
|------|--------|
| `apps/web/next.config.ts` | Conditional static export for Tauri |
| `apps/web/src-tauri/tauri.conf.json` | Updated frontendDist and beforeBuildCommand |
| `apps/web/tsconfig.json` | Exclude src-tauri directory |
| `apps/web/scripts/build-desktop.mjs` | Cross-platform build script with route exclusion |
| `apps/web/src/lib/auth-client.ts` | Tauri-aware stub auth client |
| `packages/platform/src/use-is-desktop.ts` | New React hook for safe detection |
| `packages/platform/src/index.ts` | Export useIsDesktop hook |
| `packages/platform/package.json` | Add React peer dependency |
| `apps/web/src/app/page.tsx` | Skip health check in desktop mode |
| `apps/web/src/components/user-menu.tsx` | Desktop-aware user menu |
| `apps/web/src/lib/inference/get-adapter.ts` | Async adapter with lazy loading |
| `apps/web/src/components/features/chat/chat-panel.tsx` | Dynamic import for inference |
| `apps/web/src/components/error-boundary.tsx` | New error boundary component |
| `apps/web/src/components/providers.tsx` | Wrap with ErrorBoundary |

---

## Architecture: Dual-Mode Application

The application now supports two deployment modes:

### Web Mode (Cloudflare)
- SSR with OpenNext
- Full authentication via Better Auth
- API routes for tRPC and auth
- All routes available

### Desktop Mode (Tauri)
- Static HTML export
- Auth bypassed (local user)
- No API routes (inference via Tauri IPC)
- Server-only routes excluded

The detection happens at multiple levels:
1. **Build time**: `TAURI_ENV_PLATFORM` environment variable
2. **Runtime (early)**: `window.location.protocol === "tauri:"`
3. **Runtime (React)**: `useIsDesktop()` hook for safe component-level detection
