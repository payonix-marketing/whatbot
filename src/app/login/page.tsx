"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from 'next-themes';
import { MessageSquareText } from 'lucide-react';

export default function LoginPage() {
  const { theme } = useTheme();

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="hidden bg-muted lg:flex lg:flex-col justify-between p-8 text-white bg-zinc-900">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <MessageSquareText className="w-6 h-6" />
          <span>WhatsApp Support</span>
        </div>
        <div className="text-lg">
          <blockquote className="border-l-2 pl-6 italic">
            "The best way to find yourself is to lose yourself in the service of others."
          </blockquote>
          <footer className="text-sm mt-2">- Mahatma Gandhi</footer>
        </div>
      </div>
      <div className="flex items-center justify-center min-h-screen lg:min-h-0 py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <h1 className="text-3xl font-bold">Welcome Back</h1>
            <p className="text-balance text-muted-foreground">
              Sign in to manage your conversations
            </p>
          </div>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={[]}
            theme={theme === 'dark' ? 'dark' : 'light'}
          />
        </div>
      </div>
    </div>
  );
}