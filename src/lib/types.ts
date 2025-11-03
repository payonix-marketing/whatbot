// This will represent a user profile, typically an agent
export type Profile = {
  id: string; // Corresponds to auth.users.id
  name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
};

export type Customer = {
  id: string;
  name: string | null;
  phone: string;
  created_at: string;
  is_blocked: boolean;
};

export type Attachment = {
  url: string;
  fileName: string;
  fileType: string;
};

export type Message = {
  id: string;
  text: string; // Can be a caption for an attachment
  timestamp: string;
  sender: 'customer' | 'agent';
  agentId?: string; // This will be the profile id
  attachment?: Attachment;
};

export type Conversation = {
  id:string;
  customer_id: string;
  agent_id: string | null;
  status: 'new' | 'mine' | 'resolved';
  messages: Message[]; // This is the JSONB array
  last_message_preview: string | null;
  unread_count: number;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
};

// Renaming Agent to Profile to match database
export type Agent = Profile;

export type CannedResponse = {
  id: string;
  shortcut: string;
  message: string;
  created_at: string;
};

export type AppSettings = {
  awayMessage: {
    enabled: boolean;
    text: string;
  };
  businessHours: {
    start: string;
    end: string;
    timezone: string; // e.g., 'UTC', 'America/New_York'
    days: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  };
};