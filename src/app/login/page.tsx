"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';

export default function LoginPage() {
  const { theme } = useTheme();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-center">Welcome Back</h1>
          <p className="text-center text-muted-foreground">Sign in to manage your conversations</p>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          theme={theme === 'dark' ? 'dark' : 'light'}
        />
      </div>
    </div>
  );
}