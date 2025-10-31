"use client";

import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ConversationList } from "@/components/conversation-list";
import { ChatWindow } from "@/components/chat-window";
import { CustomerProfile } from "@/components/customer-profile";
import { ConversationProvider } from "../context/conversation-context";

export default function Home() {
  return (
    <ConversationProvider>
      <main className="h-screen bg-background">
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full max-h-screen items-stretch"
        >
          <ResizablePanel defaultSize={25} minSize={20} maxSize={30}>
            <ConversationList />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={45} minSize={30}>
            <ChatWindow />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={30} minSize={20} maxSize={30}>
            <CustomerProfile />
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </ConversationProvider>
  );
}