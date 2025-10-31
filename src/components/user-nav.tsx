"use client";

import { useAuth } from "@/context/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { getInitials } from "@/lib/utils";
import { useState } from "react";
import { EditProfileDialog } from "./edit-profile-dialog";

export function UserNav() {
  const { profile } = useAuth();
  const router = useRouter();
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-12 w-full justify-start gap-3 px-3 text-left hover:bg-sidebar-accent/50">
            <Avatar className="h-9 w-9">
              <AvatarImage src={profile?.avatar_url || ''} alt={profile?.name || 'Agent'} />
              <AvatarFallback>{getInitials(profile?.name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start overflow-hidden">
              <span className="font-medium text-sm truncate">{profile?.name || 'Agent'}</span>
              <span className="text-xs text-sidebar-foreground/60 truncate">Support Agent</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{profile?.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {profile?.id ? `ID: ${profile.id.substring(0, 8)}...` : ''}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIsProfileDialogOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Profile Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="focus:bg-destructive/10 focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditProfileDialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen} />
    </>
  );
}