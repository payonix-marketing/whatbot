"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth-context';
import { RealtimeChannel } from '@supabase/supabase-js';

type TypingUser = {
  id: string;
  name: string;
};

export function useTypingIndicator(conversationId: string | null) {
  const { user, profile } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!conversationId || !user) {
      return;
    }

    const channel = supabase.channel(`typing:${conversationId}`);
    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.id !== user.id) {
          setTypingUsers(prev => {
            const userExists = prev.some(u => u.id === payload.id);
            if (userExists) return prev;
            return [...prev, { id: payload.id, name: payload.name }];
          });
        }
      })
      .on('broadcast', { event: 'stopped_typing' }, ({ payload }) => {
        if (payload.id !== user.id) {
          setTypingUsers(prev => prev.filter(u => u.id !== payload.id));
        }
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.error('Failed to subscribe to typing channel');
        }
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setTypingUsers([]);
    };
  }, [conversationId, user]);

  const startTyping = () => {
    if (channelRef.current && user && profile) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { id: user.id, name: profile.name || 'Agent' },
      });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 2000); // Stop typing after 2 seconds of inactivity
    }
  };

  const stopTyping = () => {
    if (channelRef.current && user) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      channelRef.current.send({
        type: 'broadcast',
        event: 'stopped_typing',
        payload: { id: user.id },
      });
    }
  };

  return { typingUsers, startTyping };
}