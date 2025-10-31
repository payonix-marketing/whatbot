"use client";

import { useConversations } from "../context/conversation-context";
import { useAuth } from "../context/auth-context";
import { cn, getInitials } from "@/lib/utils";
import { useState } from "react";
import type { Conversation, Customer } from "@/lib/types";
import { NewConversationDialog } from "./new-conversation-dialog";
import { UserNav } from "./user-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationListSkeleton } from "./conversation-list-skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function ConversationList() {
  const { conversations, customers, selectedConversationId, setSelectedConversationId, loading } = useConversations();
  const { user } = useAuth();
  const [filter, setFilter] = useState<Conversation['status'] | 'all'>('new');
  const [searchTerm, setSearchTerm] = useState("");

  if (loading) {
    return <ConversationListSkeleton />;
  }

  const searchedConversations = conversations.filter((conv) => {
    const customer = customers.find((c) => c.id === conv.customer_id);
    if (!customer) return false;
    const searchTermLower = searchTerm.toLowerCase();
    const customerName = customer.name?.toLowerCase() || "";
    const customerPhone = customer.phone.toLowerCase();
    return (
      customerName.includes(searchTermLower) ||
      customerPhone.includes(searchTermLower)
    );
  });

  const getFilteredConversations = (status: Conversation['status']) => {
    return searchedConversations.filter((conv: Conversation) => {
      if (status === 'mine') return conv.agent_id === user?.id;
      return conv.status === status;
    });
  };

  const renderConversationList = (convos: Conversation[]) => {
    if (convos.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-center p-4">
          <p className="text-sm text-muted-foreground">
            {searchTerm ? "No conversations found." : "No conversations in this view."}
          </p>
        </div>
      );
    }

    return convos.map((conv: Conversation) => {
      const customer = customers.find((c: Customer) => c.id === conv.customer_id);
      const isSelected = conv.id === selectedConversationId;
      const lastMessageTimestamp = conv.messages.length > 0 
        ? new Date(conv.messages[conv.messages.length - 1].timestamp) 
        : new Date(conv.updated_at);

      return (
        <div
          key={conv.id}
          className={cn(
            "flex items-center gap-3 p-3 border-b border-border cursor-pointer transition-colors",
            isSelected ? "bg-accent" : "hover:bg-muted/50"
          )}
          onClick={() => setSelectedConversationId(conv.id)}
        >
          <Avatar className="h-10 w-10">
            <AvatarFallback>{getInitials(customer?.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold truncate text-sm">{customer?.name}</h3>
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(lastMessageTimestamp, { addSuffix: true })}
              </p>
            </div>
            <div className="flex justify-between items-start">
              <p className="text-sm text-muted-foreground truncate">{conv.last_message_preview}</p>
              {conv.unread_count > 0 && (
                <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-primary-foreground bg-primary rounded-full">
                  {conv.unread_count}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-muted/30 border-r">
      <div className="p-4 border-b flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Inbox</h2>
        <NewConversationDialog />
      </div>
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mx-auto mt-2 max-w-[calc(100%-2rem)]">
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="mine">Mine</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>
        <ScrollArea className="flex-1 mt-2">
          <TabsContent value="new" className="m-0">{renderConversationList(getFilteredConversations('new'))}</TabsContent>
          <TabsContent value="mine" className="m-0">{renderConversationList(getFilteredConversations('mine'))}</TabsContent>
          <TabsContent value="resolved" className="m-0">{renderConversationList(getFilteredConversations('resolved'))}</TabsContent>
        </ScrollArea>
      </Tabs>
      <div className="p-2 border-t">
        <UserNav />
      </div>
    </div>
  );
}