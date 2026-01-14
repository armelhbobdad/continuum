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
 */
function DesktopUserMenu() {
  const [oauthDialogOpen, setOauthDialogOpen] = useState(false);
  const { isAuthenticated, isLoading, authState, clearCredentials } =
    useCredentialBridge();

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
        <Dialog onOpenChange={setOauthDialogOpen} open={oauthDialogOpen}>
          <DialogContent size="lg">
            <DialogTitle>Sign In</DialogTitle>
            <DialogDescription>
              Sign in with your account to sync your data across devices.
            </DialogDescription>
            <div className="mt-4">
              <OAuthFlow
                onCancel={() => setOauthDialogOpen(false)}
                onComplete={() => setOauthDialogOpen(false)}
                provider="google"
              />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Authenticated - show user menu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>
        {authState?.session_id ? "Authenticated" : "Local User"}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Desktop Account</DropdownMenuLabel>
          <DropdownMenuItem>
            Session: {authState?.session_id?.slice(0, 8)}...
          </DropdownMenuItem>
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
