"use client";

/**
 * Message Component
 *
 * Individual message bubble with CVA variants for user/assistant styling.
 *
 * Story 1.3: Basic Chat UI Shell
 * AC #4 (message display layout)
 */

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Message bubble variants using CVA
 * - user: right-aligned, primary color
 * - assistant: left-aligned, neutral/muted color
 */
const messageVariants = cva("max-w-[80%] rounded-2xl px-4 py-2", {
  variants: {
    role: {
      user: "ml-auto bg-primary text-primary-foreground",
      assistant: "mr-auto bg-muted text-foreground",
    },
  },
  defaultVariants: {
    role: "user",
  },
});

interface MessageProps extends VariantProps<typeof messageVariants> {
  /** Message content text */
  content: string;
  /** Message timestamp */
  timestamp: Date;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format timestamp to relative time (e.g., "2 min ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

/**
 * Message Component
 *
 * Renders a single chat message with role-based styling.
 */
export function Message({ role, content, timestamp, className }: MessageProps) {
  const formattedTime = formatRelativeTime(timestamp);

  return (
    <div
      className={cn(messageVariants({ role }), className)}
      data-role={role}
      data-slot="message"
    >
      <p className="whitespace-pre-wrap">{content}</p>
      <time
        className="mt-1 block text-xs opacity-60"
        dateTime={timestamp.toISOString()}
      >
        {formattedTime}
      </time>
    </div>
  );
}

export { messageVariants };
