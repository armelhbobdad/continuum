"use client";

/**
 * Message Component
 *
 * Individual message bubble with CVA variants for user/assistant styling.
 *
 * Story 1.3: Basic Chat UI Shell
 * AC #4 (message display layout)
 *
 * Story 2.4: Model Selection & Switching
 * Task 8.3: Display model attribution in message UI
 */

import { cva, type VariantProps } from "class-variance-authority";
import { formatRelativeTime } from "@/lib/format-relative-time";
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
  /** Model name that generated this message (assistant only, Story 2.4) */
  modelName?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Message Component
 *
 * Renders a single chat message with role-based styling.
 */
export function Message({
  role,
  content,
  timestamp,
  modelName,
  className,
}: MessageProps) {
  const formattedTime = formatRelativeTime(timestamp);

  return (
    <div
      className={cn(messageVariants({ role }), className)}
      data-model={modelName}
      data-role={role}
      data-slot="message"
    >
      <p className="whitespace-pre-wrap">{content}</p>
      <div className="mt-1 flex items-center gap-2 text-xs opacity-60">
        <time dateTime={timestamp.toISOString()}>{formattedTime}</time>
        {/* Model attribution for assistant messages (Story 2.4 Task 8.3) */}
        {role === "assistant" && modelName && (
          <>
            <span aria-hidden="true">•</span>
            <span data-testid="model-attribution">{modelName}</span>
          </>
        )}
      </div>
    </div>
  );
}

export { messageVariants };
