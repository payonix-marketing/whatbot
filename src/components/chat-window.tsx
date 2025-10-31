"use client";

import React, { useState, useRef, useEffect } from "react";
import { useConversations } from "../context/conversation-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MoreVertical, Trash2, Paperclip, Smile, MessageSquare, Phone, ArrowLeft, User } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getInitials } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import type { Message } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CustomerProfile } from "./customer-profile";

const DateSeparator = ({ date }: { date: string }) => {
  let formattedDate;
  const d = new Date(date);
  if (isToday(d)) formattedDate = "Today";
  else if (isYesterday(d)) formattedDate = "Yesterday";
  else formattedDate = format(d, "MMMM d, yyyy");

  return (
    <div className="flex justify-center my-4">
      <div className="px-3 py-1 text-xs text-muted-foreground bg-muted rounded-full">
        {formattedDate}
      </div>
    </div>
  );
};

export function ChatWindow() {
  const { selectedConversation, addMessage, deleteMessage, setSelectedConversationId } = useConversations();
  const [message, setMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [selectedConversation?.messages]);

  const handleSend = () => {
    if (selectedConversation && message.trim()) {
      addMessage(selectedConversation.id, message);
      setMessage("");
    }
  };

  if (!selectedConversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/20 text-center p-4">
        <MessageSquare className="w-16 h-16 text-muted-foreground/50" />
        <h2 className="mt-4 text-xl font-semibold">No Conversation Selected</h2>
        <p className="text-muted-foreground">Please choose a conversation from the list to start chatting.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center gap-2 md:gap-4 p-3 border-b">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setSelectedConversationId(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <Avatar>
          <AvatarFallback>{getInitials(selectedConversation.customer?.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{selectedConversation.customer?.name}</h2>
          <p className="text-sm text-muted-foreground">{selectedConversation.customer?.phone}</p>
        </div>
        {isMobile ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="p-0 w-full max-w-sm">
              <CustomerProfile />
            </SheetContent>
          </Sheet>
        ) : (
          <>
            <Button variant="ghost" size="icon"><Phone className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button>
          </>
        )}
      </header>
      
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 md:p-6 space-y-2">
          {selectedConversation.messages.map((msg: Message, index: number) => {
            const prevMsg = index > 0 ? selectedConversation.messages[index - 1] : null;
            const showDateSeparator = !prevMsg || new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();
            
            return (
              <React.Fragment key={msg.id}>
                {showDateSeparator && <DateSeparator date={msg.timestamp} />}
                <div className={`group flex items-end gap-2 ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'agent' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => deleteMessage(selectedConversation.id, msg.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <div className={`p-3 rounded-2xl max-w-md md:max-w-lg relative ${msg.sender === 'agent' ? 'bg-primary text-primary-foreground rounded-br-lg' : 'bg-muted rounded-bl-lg'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    <p className="text-xs opacity-70 mt-1 text-right">{format(new Date(msg.timestamp), 'p')}</p>
                  </div>
                  {msg.sender === 'customer' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => deleteMessage(selectedConversation.id, msg.id)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </ScrollArea>

      <footer className="p-3 border-t bg-background">
        <div className="relative">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={selectedConversation.customer?.is_blocked}
            className="pr-28 pl-10 h-10"
          />
          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center">
            <Button variant="ghost" size="icon" className="h-8 w-8"><Smile className="w-5 h-5 text-muted-foreground" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"><Paperclip className="w-5 h-5 text-muted-foreground" /></Button>
          </div>
          <Button onClick={handleSend} disabled={!message.trim() || selectedConversation.customer?.is_blocked} className="absolute right-2 top-1/2 -translate-y-1/2">
            <Send className="w-4 h-4 mr-2" /> Send
          </Button>
        </div>
        {selectedConversation.customer?.is_blocked && (
          <p className="text-sm text-destructive text-center mt-2">This customer is blocked. You cannot send messages.</p>
        )}
      </footer>
    </div>
  );
}