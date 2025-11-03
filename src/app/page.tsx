"use client";

import React from "react";
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
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = React.useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = React.useState(false);

  if (isMobile) {
    return (
      <div className="h-screen overflow-hidden">
        <div className={cn("h-full w-full", selectedConversationId ? "hidden" : "block")}>
          <ConversationList isCollapsed={false} />
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
      onLayout={(sizes) => {
        document.cookie = `react-resizable-panels:layout=${JSON.stringify(sizes)}`;
      }}
    >
      <ResizablePanel
        defaultSize={25}
        minSize={20}
        maxSize={30}
        collapsible
        collapsedSize={4}
        onCollapse={() => setIsLeftPanelCollapsed(true)}
        onExpand={() => setIsLeftPanelCollapsed(false)}
        className={cn("transition-all duration-300 ease-in-out", isLeftPanelCollapsed && "min-w-[56px]")}
      >
        <ConversationList isCollapsed={isLeftPanelCollapsed} />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50} minSize={30}>
        <ChatWindow />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        defaultSize={25}
        minSize={20}
        maxSize={30}
        collapsible
        collapsedSize={4}
        onCollapse={() => setIsRightPanelCollapsed(true)}
        onExpand={() => setIsRightPanelCollapsed(false)}
        className={cn("transition-all duration-300 ease-in-out", isRightPanelCollapsed && "min-w-[56px]")}
      >
        <CustomerProfile isCollapsed={isRightPanelCollapsed} />
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