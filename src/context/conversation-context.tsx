"use client";

import React, { createContext, useContext, useState, useMemo } from 'react';
import type { Conversation, Message, Customer, Agent } from '@/lib/types';
import { toast } from "sonner";

interface ConversationContextType {
  conversations: Conversation[];
  customers: Customer[];
  agents: Agent[];
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
  selectedConversation: (Conversation & { customer: Customer | undefined }) | null;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  addMessage: (conversationId: string, messageText: string) => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    const conversation = conversations.find(c => c.id === selectedConversationId);
    if (!conversation) return null;
    const customer = customers.find((cust: Customer) => cust.id === conversation.customer_id);
    return { ...conversation, customer };
  }, [selectedConversationId, conversations, customers]);

  const updateConversation = (id: string, updates: Partial<Conversation>) => {
    setConversations(prev =>
      prev.map(conv => (conv.id === id ? { ...conv, ...updates } : conv))
    );
  };

  const addMessage = async (conversationId: string, text: string) => {
    if (!text.trim()) return;

    const conversation = conversations.find((c: Conversation) => c.id === conversationId);
    const customer = customers.find((c: Customer) => c.id === conversation?.customer_id);

    if (!customer) {
      toast.error("Could not find customer for this conversation.");
      return;
    }

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      text,
      sender: 'agent',
      agentId: 'agent-1', // Assuming current agent is Alice for now
      timestamp: new Date().toISOString(),
    };

    // Optimistic update
    setConversations(prev =>
      prev.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: [...conv.messages, newMessage],
            last_message_preview: text,
          };
        }
        return conv;
      })
    );

    // Send message via API
    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: customer.phone, text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
      toast.success("Message sent!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Error: ${errorMessage}`);
      // Optional: Here you could add logic to mark the message as "failed" in the UI
    }
  };

  return (
    <ConversationContext.Provider
      value={{
        conversations,
        customers,
        agents,
        selectedConversationId,
        setSelectedConversationId,
        selectedConversation,
        updateConversation,
        addMessage,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversations() {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversations must be used within a ConversationProvider');
  }
  return context;
}