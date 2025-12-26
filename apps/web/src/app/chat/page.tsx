/**
 * Chat Page
 *
 * Main chat interface route.
 *
 * Story 1.3: Basic Chat UI Shell
 * AC #1 (main view layout)
 */

import { ChatLayout } from "@/components/features/chat/chat-layout";

export const metadata = {
  title: "Chat - Continuum",
  description: "AI chat interface",
};

export default function ChatPage() {
  return <ChatLayout />;
}
