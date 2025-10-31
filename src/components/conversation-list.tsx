"use client";

import { conversations, customers } from "@/lib/data";
import { Button } from "@/components/ui/button";

export function ConversationList() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">Inbox</h2>
        <div className="flex gap-2 mt-4">
          <Button variant="secondary" size="sm">New</Button>
          <Button variant="ghost" size="sm">Mine</Button>
          <Button variant="ghost" size="sm">Resolved</Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => {
          const customer = customers.find((c) => c.id === conv.customerId);
          return (
            <div key={conv.id} className="p-4 border-b cursor-pointer hover:bg-accent">
              <div className="flex justify-between">
                <h3 className="font-semibold">{customer?.name}</h3>
                {conv.unreadCount > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 text-xs text-white bg-primary rounded-full">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{conv.lastMessagePreview}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}