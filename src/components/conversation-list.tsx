"use client";

import { useConversations } from "../context/conversation-context";
import { useAuth } from "../context/auth-context";
import { cn, getInitials } from "@/lib/utils";
import { useState } from "react";
import type { Conversation, Customer, Agent } from "@/lib/types";
import { NewConversationDialog } from "./new-conversation-dialog";
import { UserNav } from "./user-nav";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationListSkeleton } from "./conversation-list-skeleton";
import { Input } from "@/components/ui/input";
import { MessageSquareText, Search } from "lucide-react";

export function ConversationList() {
  const { conversations, customers, agents, selectedConversationId, setSelectedConversationId, loading } = useConversations();
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
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <MessageSquareText className="w-12 h-12 text-sidebar-foreground/20" />
          <p className="mt-4 text-sm text-sidebar-foreground/60">
            {searchTerm ? "No conversations found." : "No conversations in this view."}
          </p>
        </div>
      );
    }

    return convos.map((conv: Conversation) => {
      const customer = customers.find((c: Customer) => c.id === conv.customer_id);
      const agent = agents.find((a: Agent) => a.id === conv.agent_id);
      const isSelected = conv.id === selectedConversationId;
      const lastMessageTimestamp = conv.messages.length > 0 
        ? new Date(conv.messages[conv.messages.length - 1].timestamp) 
        : new Date(conv.updated_at);

      return (
        <div
          key={conv.id}
          className={cn(
            "flex items-start gap-3 p-3 cursor-pointer transition-colors rounded-lg mx-2",
            isSelected ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
          )}
          onClick={() => setSelectedConversationId(conv.id)}
        >
          <Avatar className="h-10 w-10 border-2 border-sidebar-border">
            <AvatarFallback>{getInitials(customer?.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold truncate text-sm">{customer?.name}</h3>
              <p className="text-xs text-sidebar-foreground/60 whitespace-nowrap">
                {formatDistanceToNow(lastMessageTimestamp, { addSuffix: true })}
              </p>
            </div>
            <div className="flex justify-between items-start mt-1">
              <p className="text-sm text-sidebar-foreground/80 truncate">{conv.last_message_preview}</p>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {agent && (
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={agent.avatar_url || ''} alt={agent.name || 'Agent'} />
                    <AvatarFallback className="text-xs">{getInitials(agent.name)}</AvatarFallback>
                  </Avatar>
                )}
                {conv.unread_count > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-primary-foreground bg-primary rounded-full">
                    {conv.unread_count}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Inbox</h2>
        <NewConversationDialog />
      </div>
      <div className="p-3 border-b border-sidebar-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/60" />
          <Input
            placeholder="Search..."
            className="pl-9 bg-sidebar-border/50 border-sidebar-border focus:bg-sidebar-border"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-3 mx-auto mt-2 max-w-[calc(100%-1.5rem)] bg-sidebar-border/50">
          <TabsTrigger value="new" className="data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-accent-foreground">New</TabsTrigger>
          <TabsTrigger value="mine" className="data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-accent-foreground">Mine</TabsTrigger>
          <TabsTrigger value="resolved" className="data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-accent-foreground">Resolved</TabsTrigger>
        </TabsList>
        <ScrollArea className="flex-1 mt-2">
          <div className="space-y-1">
            <TabsContent value="new" className="m-0">{renderConversationList(getFilteredConversations('new'))}</TabsContent>
            <TabsContent value="mine" className="m-0">{renderConversationList(getFilteredConversations('mine'))}</TabsContent>
            <TabsContent value="resolved" className="m-0">{renderConversationList(getFilteredConversations('resolved'))}</TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
      <div className="p-2 border-t border-sidebar-border mt-auto">
        <UserNav />
      </div>
    </div>
  );
}