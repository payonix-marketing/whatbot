"use client";

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type { Conversation, Message, Customer, Agent } from '@/lib/types';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './auth-context';

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
  const { user } = useAuth();

  // Fetch initial data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: customersData, error: customersError } = await supabase.from('customers').select('*');
        if (customersError) throw customersError;
        setCustomers(customersData || []);

        const { data: agentsData, error: agentsError } = await supabase.from('profiles').select('*');
        if (agentsError) throw agentsError;
        setAgents(agentsData || []);

        const { data: conversationsData, error: conversationsError } = await supabase.from('conversations').select('*').order('updated_at', { ascending: false });
        if (conversationsError) throw conversationsError;
        setConversations(conversationsData || []);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast.error(`Failed to fetch data: ${errorMessage}`);
        console.error(error);
      }
    };

    fetchData();
  }, []);

  // Set up real-time subscriptions for live updates
  useEffect(() => {
    const conversationChannel = supabase
      .channel('realtime-conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        (payload) => {
          const updatedConv = payload.new as Conversation;
          if (payload.eventType === 'INSERT') {
            setConversations(prev => [updatedConv, ...prev]);
            toast.info(`New conversation received.`);
          }
          if (payload.eventType === 'UPDATE') {
            setConversations(prev =>
              prev.map(conv => (conv.id === updatedConv.id ? updatedConv : conv))
            );
          }
        }
      )
      .subscribe();

    const customerChannel = supabase
      .channel('realtime-customers')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'customers' },
        (payload) => {
          setCustomers(prev => [payload.new as Customer, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationChannel);
      supabase.removeChannel(customerChannel);
    };
  }, []);

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    const conversation = conversations.find(c => c.id === selectedConversationId);
    if (!conversation) return null;
    const customer = customers.find((cust: Customer) => cust.id === conversation.customer_id);
    return { ...conversation, customer };
  }, [selectedConversationId, conversations, customers]);

  const updateConversation = async (id: string, updates: Partial<Conversation>) => {
    // Optimistic UI update
    setConversations(prev =>
      prev.map(conv => (conv.id === id ? { ...conv, ...updates } : conv))
    );

    // Persist change to the database
    const { error } = await supabase.from('conversations').update(updates).eq('id', id);

    if (error) {
      toast.error(`Failed to update conversation: ${error.message}`);
      // Consider reverting the optimistic update here if needed
    }
  };

  const addMessage = async (conversationId: string, text: string) => {
    if (!text.trim() || !user) return;

    const conversation = conversations.find((c: Conversation) => c.id === conversationId);
    const customer = customers.find((c: Customer) => c.id === conversation?.customer_id);

    if (!customer || !conversation) {
      toast.error("Could not find customer for this conversation.");
      return;
    }

    const newMessage: Message = {
      id: `msg-${Date.now()}`, // Temporary ID for UI
      text,
      sender: 'agent',
      agentId: user.id,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...conversation.messages, newMessage];

    // Optimistic UI update
    setConversations(prev =>
      prev.map(conv => {
        if (conv.id === conversationId) {
          return { ...conv, messages: updatedMessages, last_message_preview: text };
        }
        return conv;
      })
    );

    // Persist message to the database
    const { error: dbError } = await supabase
      .from('conversations')
      .update({ messages: updatedMessages, last_message_preview: text })
      .eq('id', conversationId);

    if (dbError) {
      toast.error(`Failed to save message: ${dbError.message}`);
      return; // Stop if DB update fails
    }

    // Send the message via the WhatsApp API
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