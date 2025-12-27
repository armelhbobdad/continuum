"use client";
import { useIsDesktop } from "@continuum/platform";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

function getConnectionStatus(
  isDesktopApp: boolean | undefined,
  isLoading: boolean,
  data: unknown
): string {
  if (isDesktopApp === undefined) {
    return "Initializing...";
  }
  if (isDesktopApp) {
    return "Desktop Mode";
  }
  if (isLoading) {
    return "Checking...";
  }
  if (data) {
    return "Connected";
  }
  return "Disconnected";
}

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

export default function Home() {
  const isDesktopApp = useIsDesktop();

  // Skip API health check in desktop mode (no backend available)
  const healthCheck = useQuery({
    ...trpc.healthCheck.queryOptions(),
    enabled: isDesktopApp === false,
  });

  // Show green for desktop mode or when connected
  const isHealthy = isDesktopApp || healthCheck.data;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <pre className="overflow-x-auto font-mono text-sm">{TITLE_TEXT}</pre>
      <div className="grid gap-6">
        <section className="rounded-lg border p-4">
          <h2 className="mb-2 font-medium">API Status</h2>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${isHealthy ? "bg-green-500" : "bg-red-500"}`}
            />
            <span className="text-muted-foreground text-sm">
              {getConnectionStatus(
                isDesktopApp,
                healthCheck.isLoading,
                healthCheck.data
              )}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
