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
  updateConversation: (id: string, updates: Partial<Conversation>) => Promise<void>;
  addMessage: (conversationId: string, messageText: string) => Promise<void>;
  sendAttachment: (conversationId: string, file: File, caption: string) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  createNewConversation: (phone: string, messageText: string) => Promise<void>;
  addCannedResponse: (shortcut: string, message: string) => Promise<void>;
  deleteCannedResponse: (id: string) => Promise<void>;
  sendTemplateMessage: (conversationId: string, templateName: string) => Promise<void>;
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

  // Initial data fetch
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

  // --- THE REAL-TIME ENGINE ---
  // This useEffect runs ONLY ONCE to set up the subscriptions.
  // It listens for ANY change on the `conversations` table.
  useEffect(() => {
    const handleConversationChange = (payload: any) => {
      const updatedRecord = payload.new as Conversation;
      setConversations(currentConversations => {
        // Create a new list by removing the old version of the record (if it exists)
        const otherConversations = currentConversations.filter(c => c.id !== updatedRecord.id);
        
        // Add the new/updated record to the list
        const newConversationList = [updatedRecord, ...otherConversations];

        // CRITICAL: Always re-sort the entire list by the `updated_at` timestamp.
        // This is the "heartbeat" that keeps the UI in sync.
        newConversationList.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        
        // Notification logic...
        return newConversationList;
      });
    };

    const conversationChannel = supabase.channel('realtime-conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, handleConversationChange)
      .subscribe();

    // Subscriptions for other tables...
    const customerChannel = supabase.channel('realtime-customers').on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, payload => {
      const updatedCustomer = payload.new as Customer;
      setCustomers(prev => payload.eventType === 'INSERT' ? [updatedCustomer, ...prev] : prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
    }).subscribe();

    const cannedResponseChannel = supabase.channel('realtime-canned-responses').on('postgres_changes', { event: '*', schema: 'public', table: 'canned_responses' }, payload => {
      setCannedResponses(prev => {
        if (payload.eventType === 'INSERT') return [...prev, payload.new as CannedResponse].sort((a, b) => a.shortcut.localeCompare(b.shortcut));
        if (payload.eventType === 'DELETE') return prev.filter(cr => cr.id !== (payload.old as CannedResponse).id);
        return prev;
      });
    }).subscribe();

    return () => {
      supabase.removeChannel(conversationChannel);
      supabase.removeChannel(customerChannel);
      supabase.removeChannel(cannedResponseChannel);
    };
  }, []);

  const selectedConversation = useMemo(() => {
    if (!selectedConversationId) return null;
    const conversation = conversations.find(c => c.id === selectedConversationId);
    if (!conversation) return null;
    const customer = customers.find((cust: Customer) => cust.id === conversation.customer_id);
    return { ...conversation, customer };
  }, [selectedConversationId, conversations, customers]);

  // --- DATABASE MUTATION FUNCTIONS ---
  // All functions that change data now follow a simple rule:
  // 1. Update the database.
  // 2. ALWAYS include a fresh `updated_at` timestamp.
  // 3. Let the real-time subscription handle the UI update.

  const updateConversation = async (id: string, updates: Partial<Conversation>) => {
    const updatesWithTimestamp = { ...updates, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('conversations').update(updatesWithTimestamp).eq('id', id);
    if (error) toast.error(`Failed to update conversation: ${error.message}`);
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    const { error } = await supabase.from('customers').update(updates).eq('id', id);
    if (error) toast.error(`Failed to update customer: ${error.message}`);
  };

  const addMessage = async (conversationId: string, text: string): Promise<void> => {
    if (!text.trim() || !user) return;
    const conversation = conversations.find(c => c.id === conversationId);
    const customer = customers.find(c => c.id === conversation?.customer_id);
    if (!customer || !conversation) {
      toast.error("Conversation not found.");
      return;
    }

    const newMessage: Message = { id: crypto.randomUUID(), text, sender: 'agent', agentId: user.id, timestamp: new Date().toISOString() };
    const updatedMessages = [...(conversation.messages || []), newMessage];
    
    const { error: dbError } = await supabase.from('conversations').update({ 
      messages: updatedMessages, 
      last_message_preview: text, 
      updated_at: new Date().toISOString() // The critical heartbeat
    }).eq('id', conversationId);

    if (dbError) {
      toast.error(`Failed to save message: ${dbError.message}`);
      return;
    }

    try {
      const response = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: customer.phone, text }) });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
    } catch (error) {
      toast.error(`Message failed to send: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const sendAttachment = async (conversationId: string, file: File, caption: string): Promise<void> => {
    if (!user) {
      toast.error("You must be logged in.");
      return;
    }
    const conversation = conversations.find(c => c.id === conversationId);
    const customer = customers.find(c => c.id === conversation?.customer_id);
    if (!customer || !conversation) {
      toast.error("Conversation not found.");
      return;
    }

    const toastId = toast.loading("Uploading attachment...");
    try {
      const filePath = `${user.id}/${conversationId}/${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
      const newMessage: Message = { id: crypto.randomUUID(), text: caption, sender: 'agent', agentId: user.id, timestamp: new Date().toISOString(), attachment: { url: publicUrl, fileName: file.name, fileType: file.type } };
      const updatedMessages = [...(conversation.messages || []), newMessage];
      
      const { error: dbError } = await supabase.from('conversations').update({ messages: updatedMessages, last_message_preview: caption || file.name, updated_at: new Date().toISOString() }).eq('id', conversationId);
      if (dbError) throw new Error(`Failed to save message: ${dbError.message}`);

      toast.loading("Sending message...", { id: toastId });
      const response = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: customer.phone, text: caption, attachmentUrl: publicUrl, mimeType: file.type, fileName: file.name }) });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to send');
      
      toast.success("Attachment sent!", { id: toastId });
    } catch (error) {
      toast.error(`Failed to send attachment: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
    }
  };

  const deleteMessage = async (conversationId: string, messageId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;
    const updatedMessages = conversation.messages.filter(m => m.id !== messageId);
    const { error } = await supabase.from('conversations').update({ messages: updatedMessages, updated_at: new Date().toISOString() }).eq('id', conversationId);
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
    const newMessage: Message = { id: crypto.randomUUID(), text, sender: 'agent', agentId: user.id, timestamp: new Date().toISOString() };
    const { data: newConversation, error: convError } = await supabase.from('conversations').insert({ customer_id: customer.id, agent_id: user.id, messages: [newMessage], last_message_preview: text, status: 'mine' }).select().single();
    if (convError) throw convError;
    setSelectedConversationId(newConversation.id);
    try {
      const response = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: phone, text }) });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to send');
      toast.success("Message sent!");
    } catch (error) {
      toast.error(`Conversation created, but message failed to send: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const addCannedResponse = async (shortcut: string, message: string) => {
    const { error } = await supabase.from('canned_responses').insert({ shortcut, message });
    if (error) throw new Error(error.message);
  };

  const deleteCannedResponse = async (id: string) => {
    const { error } = await supabase.from('canned_responses').delete().eq('id', id);
    if (error) throw new Error(error.message);
  };

  const sendTemplateMessage = async (conversationId: string, templateName: string): Promise<void> => {
    const conversation = conversations.find(c => c.id === conversationId);
    const customer = customers.find(c => c.id === conversation?.customer_id);
    if (!customer || !conversation) {
      toast.error("Conversation not found.");
      return;
    }
    const toastId = toast.loading(`Sending template "${templateName}"...`);
    try {
      const response = await fetch('/api/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: customer.phone, template: { name: templateName, language: { code: 'az' } } }) });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to send template');
      const systemMessage: Message = { id: crypto.randomUUID(), text: `[Template "${templateName}" sent]`, sender: 'agent', agentId: 'system', timestamp: new Date().toISOString() };
      const updatedMessages = [...(conversation.messages || []), systemMessage];
      const { error: dbError } = await supabase.from('conversations').update({ messages: updatedMessages, last_message_preview: `Template: ${templateName}`, updated_at: new Date().toISOString() }).eq('id', conversationId);
      if (dbError) throw new Error(`Failed to log template message: ${dbError.message}`);
      toast.success(`Template sent!`, { id: toastId });
    } catch (error) {
      toast.error(`Failed to send template: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: toastId });
    }
  };

  return (
    <ConversationContext.Provider value={{ conversations, customers, agents, cannedResponses, onlineAgentIds, loading, selectedConversationId, setSelectedConversationId, selectedConversation, updateConversation, addMessage, sendAttachment, deleteMessage, updateCustomer, createNewConversation, addCannedResponse, deleteCannedResponse, sendTemplateMessage }}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversations() {
  const context = useContext(ConversationContext);
  if (context === undefined) throw new Error('useConversations must be used within a ConversationProvider');
  return context;
}