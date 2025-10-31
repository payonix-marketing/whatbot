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
  deleteMessage: (conversationId: string, messageId: string) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const { user } = useAuth();

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
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const conversationChannel = supabase.channel('realtime-conversations').on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, payload => {
      const updatedConv = payload.new as Conversation;
      if (payload.eventType === 'INSERT') {
        setConversations(prev => [updatedConv, ...prev]);
        toast.info(`New conversation received.`);
      }
      if (payload.eventType === 'UPDATE') {
        setConversations(prev => prev.map(conv => (conv.id === updatedConv.id ? updatedConv : conv)));
      }
    }).subscribe();

    const customerChannel = supabase.channel('realtime-customers').on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, payload => {
      const updatedCustomer = payload.new as Customer;
      if (payload.eventType === 'INSERT') {
        setCustomers(prev => [updatedCustomer, ...prev]);
      }
      if (payload.eventType === 'UPDATE') {
        setCustomers(prev => prev.map(cust => (cust.id === updatedCustomer.id ? updatedCustomer : cust)));
      }
    }).subscribe();

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
    setConversations(prev => prev.map(conv => (conv.id === id ? { ...conv, ...updates } : conv)));
    const { error } = await supabase.from('conversations').update(updates).eq('id', id);
    if (error) toast.error(`Failed to update conversation: ${error.message}`);
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    setCustomers(prev => prev.map(cust => (cust.id === id ? { ...cust, ...updates } : cust)));
    const { error } = await supabase.from('customers').update(updates).eq('id', id);
    if (error) toast.error(`Failed to update customer: ${error.message}`);
  };

  const addMessage = async (conversationId: string, text: string) => {
    if (!text.trim() || !user) return;

    const conversation = conversations.find((c: Conversation) => c.id === conversationId);
    const customer = customers.find((c: Customer) => c.id === conversation?.customer_id);

    if (!customer || !conversation) return toast.error("Could not find customer for this conversation.");
    if (customer.is_blocked) return toast.error("Cannot send message to a blocked customer.");

    const newMessage: Message = {
      id: crypto.randomUUID(),
      text,
      sender: 'agent',
      agentId: user.id,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...conversation.messages, newMessage];
    setConversations(prev => prev.map(conv => conv.id === conversationId ? { ...conv, messages: updatedMessages, last_message_preview: text } : conv));

    const { error: dbError } = await supabase.from('conversations').update({ messages: updatedMessages, last_message_preview: text }).eq('id', conversationId);
    if (dbError) return toast.error(`Failed to save message: ${dbError.message}`);

    try {
      const response = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: customer.phone, text }) });
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

  const deleteMessage = async (conversationId: string, messageId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    const updatedMessages = conversation.messages.filter(m => m.id !== messageId);
    setConversations(prev => prev.map(conv => conv.id === conversationId ? { ...conv, messages: updatedMessages } : conv));

    const { error } = await supabase.from('conversations').update({ messages: updatedMessages }).eq('id', conversationId);
    if (error) toast.error(`Failed to delete message: ${error.message}`);
    else toast.success("Message deleted.");
  };

  return (
    <ConversationContext.Provider value={{ conversations, customers, agents, selectedConversationId, setSelectedConversationId, selectedConversation, updateConversation, addMessage, deleteMessage, updateCustomer }}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversations() {
  const context = useContext(ConversationContext);
  if (context === undefined) throw new Error('useConversations must be used within a ConversationProvider');
  return context;
}