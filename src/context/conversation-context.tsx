"use client";

import React, { createContext, useContext, useState, useMemo } from 'react';
import { conversations as initialConversations, customers, agents } from '@/lib/data';
import type { Conversation, Message, Customer, Agent } from '@/lib/types';

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
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(conversations[0]?.id || null);

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    const conversation = conversations.find(c => c.id === selectedConversationId);
    if (!conversation) return null;
    const customer = customers.find(cust => cust.id === conversation.customerId);
    return { ...conversation, customer };
  }, [selectedConversationId, conversations]);

  const updateConversation = (id: string, updates: Partial<Conversation>) => {
    setConversations(prev =>
      prev.map(conv => (conv.id === id ? { ...conv, ...updates } : conv))
    );
  };

  const addMessage = (conversationId: string, text: string) => {
    if (!text.trim()) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      text,
      sender: 'agent',
      agentId: 'agent-1', // Assuming current agent is Alice for now
      timestamp: new Date().toISOString(),
    };

    setConversations(prev =>
      prev.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: [...conv.messages, newMessage],
            lastMessagePreview: text,
          };
        }
        return conv;
      })
    );
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