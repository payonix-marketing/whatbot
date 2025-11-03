"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth-context';
import { RealtimeChannel } from '@supabase/supabase-js';

type ViewingUser = {
  user_id: string;
  name: string;
  avatar_url?: string;
};

export function useConversationPresence(conversationId: string | null) {
  const { user, profile } = useAuth();
  const [viewingUsers, setViewingUsers] = useState<ViewingUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!conversationId || !user || !profile) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setViewingUsers([]);
      }
      return;
    }

    if (channelRef.current && channelRef.current.topic !== `conversation:${conversationId}`) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
    }

    if (!channelRef.current) {
        const channel = supabase.channel(`conversation:${conversationId}`);
        channelRef.current = channel;

        channel
          .on('presence', { event: 'sync' }, () => {
            const presenceState = channel.presenceState<ViewingUser>();
            const viewers = Object.values(presenceState).flat();
            setViewingUsers(viewers);
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.track({ 
                user_id: user.id, 
                name: profile.name || 'Agent',
                avatar_url: profile.avatar_url || ''
              });
            }
          });
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, user, profile]);

  const otherViewingUsers = viewingUsers.filter(
    (viewer) => viewer.user_id !== user?.id
  );

  return otherViewingUsers;
}