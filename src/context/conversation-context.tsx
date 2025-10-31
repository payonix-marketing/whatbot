"use client";

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type { Conversation, Message, Customer, Agent, CannedResponse } from '@/lib/types';
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './auth-context';
import { useNotifications } from '@/hooks/use-notifications';
import { usePresence } from '@/hooks/use-presence';

interface ConversationContextType {
  conversations: Conversation[];
  customers: Customer[];
  agents: Agent[];
  cannedResponses: CannedResponse[];
  onlineAgentIds: string[];
  loading: boolean;
  selectedConversationId: string | null;
  setSelectedConversationId: (id: string | null) => void;
  selectedConversation: (Conversation & { customer: Customer | undefined }) | null;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  addMessage: (conversationId: string, messageText: string) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  createNewConversation: (phone: string, messageText: string) => Promise<void>;
  addCannedResponse: (shortcut: string, message: string) => Promise<void>;
  deleteCannedResponse: (id: string) => Promise<void>;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export function ConversationProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { requestPermission, showNotification, permission } = useNotifications();
  const onlineAgentIds = usePresence();

  useEffect(() => {
    if (permission === 'default') {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [
          { data: customersData, error: customersError },
          { data: agentsData, error: agentsError },
          { data: conversationsData, error: conversationsError },
          { data: cannedResponsesData, error: cannedResponsesError },
        ] = await Promise.all([
          supabase.from('customers').select('*'),
          supabase.from('profiles').select('*'),
          supabase.from('conversations').select('*').order('updated_at', { ascending: false }),
          supabase.from('canned_responses').select('*').order('shortcut', { ascending: true }),
        ]);

        if (customersError) throw customersError;
        if (agentsError) throw agentsError;
        if (conversationsError) throw conversationsError;
        if (cannedResponsesError) throw cannedResponsesError;

        setCustomers(customersData || []);
        setAgents(agentsData || []);
        setConversations(conversationsData || []);
        setCannedResponses(cannedResponsesData || []);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast.error(`Failed to fetch data: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleNewMessage = (payload: any) => {
      const updatedConv = payload.new as Conversation;
      const oldConv = conversations.find(c => c.id === updatedConv.id);
      setConversations(prev => prev.map(conv => (conv.id === updatedConv.id ? updatedConv : conv)));
      
      if (oldConv && updatedConv.messages.length > oldConv.messages.length) {
          const lastMessage = updatedConv.messages[updatedConv.messages.length - 1];
          if (lastMessage.sender === 'customer') {
              const customer = customers.find(c => c.id === updatedConv.customer_id);
              const notificationTitle = `New message from ${customer?.name || 'a customer'}`;
              const notificationBody = lastMessage.text;
              
              toast.info(notificationBody, { description: notificationTitle });
              showNotification(notificationTitle, { body: notificationBody, icon: '/favicon.ico' });
          }
      }
    };

    const handleNewConversation = (payload: any) => {
      const newConv = payload.new as Conversation;
      setConversations(prev => [newConv, ...prev]);
      const customer = customers.find(c => c.id === newConv.customer_id);
      const notificationTitle = `New conversation from ${customer?.name || 'a customer'}`;
      const notificationBody = newConv.last_message_preview || "New message received.";

      toast.info(notificationBody, { description: notificationTitle });
      showNotification(notificationTitle, { body: notificationBody, icon: '/favicon.ico' });
    };

    const conversationChannel = supabase.channel('realtime-conversations')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, handleNewMessage)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, handleNewConversation)
      .subscribe();

    const customerChannel = supabase.channel('realtime-customers').on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, payload => {
      const updatedCustomer = payload.new as Customer;
      if (payload.eventType === 'INSERT') {
        setCustomers(prev => [updatedCustomer, ...prev]);
      }
      if (payload.eventType === 'UPDATE') {
        setCustomers(prev => prev.map(cust => (cust.id === updatedCustomer.id ? updatedCustomer : cust)));
      }
    }).subscribe();

    const cannedResponseChannel = supabase.channel('realtime-canned-responses').on('postgres_changes', { event: '*', schema: 'public', table: 'canned_responses' }, payload => {
      if (payload.eventType === 'INSERT') {
        setCannedResponses(prev => [...prev, payload.new as CannedResponse].sort((a, b) => a.shortcut.localeCompare(b.shortcut)));
      }
      if (payload.eventType === 'DELETE') {
        setCannedResponses(prev => prev.filter(cr => cr.id !== (payload.old as CannedResponse).id));
      }
    }).subscribe();

    return () => {
      supabase.removeChannel(conversationChannel);
      supabase.removeChannel(customerChannel);
      supabase.removeChannel(cannedResponseChannel);
    };
  }, [conversations, customers, showNotification]);

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

    const conversation = conversations.find(c => c.id === conversationId);
    const customer = customers.find(c => c.id === conversation?.customer_id);

    if (!customer || !conversation) return toast.error("Could not find customer for this conversation.");
    if (customer.is_blocked) return toast.error("Cannot send message to a blocked customer.");

    const newMessage: Message = {
      id: crypto.randomUUID(),
      text,
      sender: 'agent',
      agentId: user.id,
      timestamp: new Date().toISOString(),
    };

    const originalConversation = { ...conversation };
    const updatedMessages = [...(conversation.messages || []), newMessage];
    setConversations(prev => prev.map(conv => conv.id === conversationId ? { ...conv, messages: updatedMessages, last_message_preview: text } : conv));

    const { error: dbError } = await supabase.from('conversations').update({ messages: updatedMessages, last_message_preview: text }).eq('id', conversationId);

    if (dbError) {
      toast.error(`Failed to save message: ${dbError.message}`);
      setConversations(prev => prev.map(conv => (conv.id === conversationId ? originalConversation : conv)));
      return;
    }

    try {
      const response = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: customer.phone, text }) });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Message failed to send: ${errorMessage}`);
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

  const createNewConversation = async (phone: string, text: string) => {
    if (!text.trim() || !user) throw new Error("User not authenticated or message is empty.");

    let { data: customer, error: customerError } = await supabase.from('customers').select('*').eq('phone', phone).single();
    if (customerError && customerError.code !== 'PGRST116') throw customerError;

    if (!customer) {
      const { data: newCustomer, error: newCustomerError } = await supabase.from('customers').insert({ phone, name: `Customer ${phone.slice(-4)}` }).select().single();
      if (newCustomerError) throw newCustomerError;
      customer = newCustomer;
    }

    const newMessage: Message = {
      id: crypto.randomUUID(),
      text,
      sender: 'agent',
      agentId: user.id,
      timestamp: new Date().toISOString(),
    };

    const { data: newConversation, error: convError } = await supabase.from('conversations').insert({
      customer_id: customer.id,
      agent_id: user.id,
      messages: [newMessage],
      last_message_preview: text,
      status: 'mine',
    }).select().single();

    if (convError) throw convError;
    
    setSelectedConversationId(newConversation.id);

    try {
      const response = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: phone, text }) });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message via API');
      }
      toast.success("Message sent!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Conversation created, but message failed to send: ${errorMessage}`);
    }
  };

  const addCannedResponse = async (shortcut: string, message: string) => {
    const { error } = await supabase.from('canned_responses').insert({ shortcut, message });
    if (error) {
      toast.error(`Failed to add canned response: ${error.message}`);
      throw error;
    }
  };

  const deleteCannedResponse = async (id: string) => {
    const { error } = await supabase.from('canned_responses').delete().eq('id', id);
    if (error) {
      toast.error(`Failed to delete canned response: ${error.message}`);
      throw error;
    }
  };

  return (
    <ConversationContext.Provider value={{ conversations, customers, agents, cannedResponses, onlineAgentIds, loading, selectedConversationId, setSelectedConversationId, selectedConversation, updateConversation, addMessage, deleteMessage, updateCustomer, createNewConversation, addCannedResponse, deleteCannedResponse }}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversations() {
  const context = useContext(ConversationContext);
  if (context === undefined) throw new Error('useConversations must be used within a ConversationProvider');
  return context;
}