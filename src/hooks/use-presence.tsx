"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth-context';
import { RealtimeChannel } from '@supabase/supabase-js';

const PRESENCE_CHANNEL = 'agent-presence';

export function usePresence() {
  const { user, profile } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user || !profile) return;

    const channel = supabase.channel(PRESENCE_CHANNEL);
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const userIds = [];
        for (const id in channel.presenceState()) {
          userIds.push(id);
        }
        setOnlineUsers(userIds);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers(prev => [...new Set([...prev, key])]);
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => prev.filter(id => id !== key));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, name: profile.name });
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, profile]);

  return onlineUsers;
}