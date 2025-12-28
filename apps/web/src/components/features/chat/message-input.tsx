"use client";

/**
 * Message Input Component
 *
 * Textarea input for composing messages with multiline support.
 *
 * Story 1.3: Basic Chat UI Shell
 * AC #2 (input responsiveness), AC #3 (message submission)
 *
 * Story 2.4: Model Selection & Switching
 * Task 5.3: Disable send button during switch with tooltip explanation
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  /** Reason for disabled state (shown in tooltip) */
  disabledReason?: string;
}

/**
 * Message Input Component
 *
 * Handles text input and submission.
 * Enter to send, Shift+Enter for newline.
 */
export function MessageInput({
  onSend,
  disabled,
  disabledReason,
}: MessageInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;

    onSend(trimmed);
    setValue("");
    textareaRef.current?.focus();
  }, [value, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
      // Shift+Enter allows newline (default textarea behavior)
    },
    [handleSend]
  );

  return (
    <div
      className="flex gap-2 border-t p-4"
      data-slot="message-input"
      data-testid="message-input"
    >
      <Textarea
        aria-label="Message input"
        className="max-h-32 min-h-10 flex-1 resize-none"
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message... (Shift+Enter for newline)"
        ref={textareaRef}
        rows={1}
        value={value}
      />
      <Button
        aria-label="Send message"
        className="self-end"
        disabled={disabled || !value.trim()}
        onClick={handleSend}
        title={disabled && disabledReason ? disabledReason : undefined}
      >
        Send
      </Button>
    </div>
  );
}
