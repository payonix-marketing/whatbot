"use client";

import { useConversations } from "../context/conversation-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { Conversation, Customer } from "@/lib/types";

export function ConversationList() {
  const { conversations, customers, selectedConversationId, setSelectedConversationId } = useConversations();
  const [filter, setFilter] = useState<Conversation['status'] | 'all'>('new');

  const filteredConversations = conversations.filter((conv: Conversation) => {
    if (filter === 'all') return true;
    return conv.status === filter;
  });

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-xl font-semibold text-sidebar-foreground">Inbox</h2>
        <div className="flex gap-1 mt-4">
          <Button onClick={() => setFilter('new')} variant={filter === 'new' ? 'secondary' : 'ghost'} size="sm" className="flex-1">New</Button>
          <Button onClick={() => setFilter('mine')} variant={filter === 'mine' ? 'secondary' : 'ghost'} size="sm" className="flex-1">Mine</Button>
          <Button onClick={() => setFilter('resolved')} variant={filter === 'resolved' ? 'secondary' : 'ghost'} size="sm" className="flex-1">Resolved</Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.map((conv: Conversation) => {
          const customer = customers.find((c: Customer) => c.id === conv.customerId);
          const isSelected = conv.id === selectedConversationId;
          return (
            <div
              key={conv.id}
              className={cn(
                "p-4 border-b border-sidebar-border cursor-pointer",
                isSelected ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50"
              )}
              onClick={() => setSelectedConversationId(conv.id)}
            >
              <div className="flex justify-between">
                <h3 className={cn("font-semibold", isSelected ? "text-sidebar-accent-foreground" : "text-sidebar-foreground")}>{customer?.name}</h3>
                {conv.unreadCount > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 text-xs text-primary-foreground bg-primary rounded-full">
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