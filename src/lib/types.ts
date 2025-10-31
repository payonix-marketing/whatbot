export type Agent = {
  id: string;
  name: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
};

export type Message = {
  id: string;
  text: string;
  timestamp: string;
  sender: 'customer' | 'agent';
  agentId?: string;
};

export type Conversation = {
  id: string;
  customerId: string;
  agentId?: string;
  status: 'new' | 'mine' | 'resolved';
  messages: Message[];
  lastMessagePreview: string;
  unreadCount: number;
  internalNotes: string;
};