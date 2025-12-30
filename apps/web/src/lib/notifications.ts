/**
 * Notification Handler
 * Story 2.3: Model Download Manager - Task 9
 *
 * Handles desktop notifications for download events.
 * AC3: Download completion notifications
 *
 * Uses Tauri notification plugin on desktop, web Notification API fallback.
 */

import { isDesktop } from "@continuum/platform";

// ============================================================================
// Types
// ============================================================================

interface NotificationOptions {
  /** Notification title */
  title: string;
  /** Notification body text */
  body: string;
  /** Optional icon URL */
  icon?: string;
}

type NotificationPermission = "granted" | "denied" | "default";

// ============================================================================
// Permission Management
// ============================================================================

/**
 * Check if notifications are supported
 */
export function isNotificationSupported(): boolean {
  if (isDesktop()) {
    return true;
  }
  return typeof Notification !== "undefined";
}

/**
 * Get current notification permission
 */
export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (isDesktop()) {
    try {
      const { isPermissionGranted } = await import(
        "@tauri-apps/plugin-notification"
      );
      const granted = await isPermissionGranted();
      return granted ? "granted" : "default";
    } catch {
      return "default";
    }
  }

  if (typeof Notification !== "undefined") {
    return Notification.permission as NotificationPermission;
  }

  return "denied";
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (isDesktop()) {
    try {
      const { requestPermission, isPermissionGranted } = await import(
        "@tauri-apps/plugin-notification"
      );
      await requestPermission();
      const granted = await isPermissionGranted();
      return granted ? "granted" : "denied";
    } catch {
      return "denied";
    }
  }

  if (typeof Notification !== "undefined") {
    const result = await Notification.requestPermission();
    return result as NotificationPermission;
  }

  return "denied";
}

// ============================================================================
// Notification Sending
// ============================================================================

/**
 * Send a notification
 */
export async function sendNotification(
  options: NotificationOptions
): Promise<boolean> {
  const permission = await getNotificationPermission();

  if (permission !== "granted") {
    return false;
  }

  if (isDesktop()) {
    try {
      const { sendNotification: tauriSendNotification } = await import(
        "@tauri-apps/plugin-notification"
      );
      await tauriSendNotification({
        title: options.title,
        body: options.body,
      });
      return true;
    } catch {
      return false;
    }
  }

  if (typeof Notification !== "undefined") {
    try {
      new Notification(options.title, {
        body: options.body,
        icon: options.icon,
      });
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

// ============================================================================
// Download-Specific Notifications
// ============================================================================

/**
 * Send download complete notification
 * AC3: Notification on download completion
 */
export async function notifyDownloadComplete(modelName: string): Promise<void> {
  await sendNotification({
    title: "Download Complete",
    body: `${modelName} is ready to use`,
  });
}

/**
 * Send download failed notification
 */
export async function notifyDownloadFailed(
  modelName: string,
  error?: string
): Promise<void> {
  await sendNotification({
    title: "Download Failed",
    body: error ? `${modelName}: ${error}` : `Failed to download ${modelName}`,
  });
}

/**
 * Send low storage warning notification
 */
export async function notifyLowStorage(requiredMb: number): Promise<void> {
  await sendNotification({
    title: "Low Storage",
    body: `Need ${requiredMb >= 1024 ? `${(requiredMb / 1024).toFixed(1)} GB` : `${requiredMb} MB`} more space`,
  });
}
