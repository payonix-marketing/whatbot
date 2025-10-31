"use client";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ConversationList } from "@/components/conversation-list";
import { ChatWindow } from "@/components/chat-window";
import { CustomerProfile } from "@/components/customer-profile";
import { ConversationProvider, useConversations } from "@/context/conversation-context";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";

function ChatLayout() {
  const { selectedConversationId } = useConversations();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="h-screen overflow-hidden">
        <div className={cn("h-full w-full", selectedConversationId ? "hidden" : "block")}>
          <ConversationList />
        </div>
        {selectedConversationId && (
          <div className="h-full w-full">
            <ChatWindow />
          </div>
        )}
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full max-h-screen items-stretch"
    >
      <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
        <ConversationList />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={45} minSize={30}>
        <ChatWindow />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
        <CustomerProfile />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export default function Home() {
  return (
    <ConversationProvider>
      <main className="h-screen bg-background text-foreground">
        <ChatLayout />
      </main>
    </ConversationProvider>
  );
}