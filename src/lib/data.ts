import { Agent, Customer, Conversation } from './types';

export const agents: Agent[] = [
  { id: 'agent-1', name: 'Alice' },
  { id: 'agent-2', name: 'Bob' },
];

export const customers: Customer[] = [
  { id: 'cust-1', name: 'John Doe', phone: '+15551234567' },
  { id: 'cust-2', name: 'Jane Smith', phone: '+15557654321' },
  { id: 'cust-3', name: 'Sam Wilson', phone: '+15559876543' },
];

export const conversations: Conversation[] = [
  {
    id: 'conv-1',
    customerId: 'cust-1',
    agentId: 'agent-1',
    status: 'mine',
    lastMessagePreview: 'Thanks for your help!',
    unreadCount: 0,
    internalNotes: 'Customer was asking about order #12345.',
    messages: [
      { id: 'msg-1-1', text: 'Hello, I have a question about my order.', sender: 'customer', timestamp: '2024-07-30T10:00:00Z' },
      { id: 'msg-1-2', text: 'Hi John, I can help with that. What is your order number?', sender: 'agent', agentId: 'agent-1', timestamp: '2024-07-30T10:01:00Z' },
      { id: 'msg-1-3', text: 'It is #12345.', sender: 'customer', timestamp: '2024-07-30T10:02:00Z' },
      { id: 'msg-1-4', text: 'Thanks for your help!', sender: 'customer', timestamp: '2024-07-30T10:05:00Z' },
    ],
  },
  {
    id: 'conv-2',
    customerId: 'cust-2',
    status: 'new',
    lastMessagePreview: 'Is this item in stock?',
    unreadCount: 1,
    internalNotes: '',
    messages: [
      { id: 'msg-2-1', text: 'Is this item in stock?', sender: 'customer', timestamp: '2024-07-30T11:30:00Z' },
    ],
  },
  {
    id: 'conv-3',
    customerId: 'cust-3',
    status: 'resolved',
    lastMessagePreview: 'Perfect, that solves it.',
    unreadCount: 0,
    internalNotes: 'Resolved issue with shipping address.',
    messages: [
      { id: 'msg-3-1', text: 'I need to change my shipping address.', sender: 'customer', timestamp: '2024-07-29T15:00:00Z' },
      { id: 'msg-3-2', text: 'No problem, I have updated it for you.', sender: 'agent', agentId: 'agent-2', timestamp: '2024-07-29T15:05:00Z' },
      { id: 'msg-3-3', text: 'Perfect, that solves it.', sender: 'customer', timestamp: '2024-07-29T15:06:00Z' },
    ],
  },
];