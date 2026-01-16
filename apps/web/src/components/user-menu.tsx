"use client";

import { useIsDesktop } from "@continuum/platform";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OAuthFlow } from "@/components/features/credentials";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCredentialBridge } from "@/hooks";
import { authClient } from "@/lib/auth-client";
import type { OAuthProvider } from "@/types";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

function WebUserMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <Skeleton className="h-9 w-24" />;
  }

  if (!session) {
    return (
      <Button render={<Link href="/login" />} variant="outline">
        Sign In
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        {session.user.name}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuItem>{session.user.email}</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            authClient.signOut({
              fetchOptions: {
                onSuccess: () => {
                  router.push("/");
                },
              },
            });
          }}
          variant="destructive"
        >
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Desktop User Menu (Story 5.3)
 *
 * Shows OAuth sign-in flow for desktop app users.
 * Supports multiple OAuth providers (Google, GitHub).
 */
function DesktopUserMenu() {
  const [oauthDialogOpen, setOauthDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<OAuthProvider | null>(null);
  const {
    isAuthenticated,
    isLoading,
    authState,
    clearCredentials,
    refreshAuthState,
  } = useCredentialBridge();

  // Handle OAuth completion - refresh auth state then close dialog
  const handleOAuthComplete = async () => {
    await refreshAuthState();
    setOauthDialogOpen(false);
    setSelectedProvider(null);
  };

  // Handle cancel - go back to provider selection or close dialog
  const handleCancel = () => {
    if (selectedProvider) {
      setSelectedProvider(null);
    } else {
      setOauthDialogOpen(false);
    }
  };

  // Start OAuth with selected provider
  const handleProviderSelect = (provider: OAuthProvider) => {
    setSelectedProvider(provider);
  };

  if (isLoading) {
    return <Skeleton className="h-9 w-24" />;
  }

  // Not authenticated - show Sign In button that opens OAuth dialog
  if (!isAuthenticated) {
    return (
      <>
        <Button onClick={() => setOauthDialogOpen(true)} variant="outline">
          Sign In
        </Button>
        <Dialog
          onOpenChange={(open) => {
            setOauthDialogOpen(open);
            if (!open) {
              setSelectedProvider(null);
            }
          }}
          open={oauthDialogOpen}
        >
          <DialogContent size="lg">
            <DialogTitle>Sign In</DialogTitle>
            <DialogDescription>
              Sign in with your account to sync your data across devices.
            </DialogDescription>
            <div className="mt-4">
              {selectedProvider ? (
                <OAuthFlow
                  onCancel={handleCancel}
                  onComplete={handleOAuthComplete}
                  provider={selectedProvider}
                />
              ) : (
                <div className="flex flex-col gap-3">
                  <Button
                    className="flex items-center justify-center gap-2"
                    onClick={() => handleProviderSelect("google")}
                    variant="outline"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                  <Button
                    className="flex items-center justify-center gap-2"
                    onClick={() => handleProviderSelect("github")}
                    variant="outline"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        fillRule="evenodd"
                      />
                    </svg>
                    Continue with GitHub
                  </Button>
                  <Button
                    className="flex items-center justify-center gap-2"
                    onClick={() => handleProviderSelect("zoom")}
                    variant="outline"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M4.585 6.836A2.167 2.167 0 0 0 2.417 9v6a2.167 2.167 0 0 0 2.168 2.166h8.666A2.167 2.167 0 0 0 15.417 15V9a2.167 2.167 0 0 0-2.166-2.164H4.585zm12.998 1.33v7.668l4.166 2.5a.833.833 0 0 0 1.25-.722V6.388a.833.833 0 0 0-1.25-.722l-4.166 2.5z"
                        fill="#2D8CFF"
                      />
                    </svg>
                    Continue with Zoom
                  </Button>
                  <p className="mt-2 text-center text-muted-foreground text-xs">
                    Choose a provider to sign in with your existing account.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Get user display info
  const userDisplayName =
    authState?.user_info?.display_name ||
    authState?.user_info?.email?.split("@")[0] ||
    "User";
  const userPicture = authState?.user_info?.picture;
  const userInitials = userDisplayName.slice(0, 2).toUpperCase();

  // Authenticated - show user menu with avatar
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button className="p-1" variant="outline" />}
      >
        {userPicture ? (
          <img
            alt={userDisplayName}
            className="h-7 w-7 rounded-full object-cover"
            referrerPolicy="no-referrer"
            src={userPicture}
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-xs">
            {userInitials}
          </div>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {authState?.user_info?.display_name || "Desktop Account"}
          </DropdownMenuLabel>
          {authState?.user_info?.email && (
            <DropdownMenuItem>{authState.user_info.email}</DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            clearCredentials();
          }}
          variant="destructive"
        >
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function UserMenu() {
  const isDesktopApp = useIsDesktop();

  // Show skeleton during initialization to prevent hydration mismatch
  if (isDesktopApp === undefined) {
    return <Skeleton className="h-9 w-24" />;
  }

  // Desktop mode: OAuth flow with Rust backend (Story 5.3)
  if (isDesktopApp) {
    return <DesktopUserMenu />;
  }

  // Web mode: full auth flow with Better Auth
  return <WebUserMenu />;
}
