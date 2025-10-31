"use client";

import { useState, useRef, useEffect } from "react";
import { useConversations } from "../context/conversation-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MoreVertical, Trash2, Paperclip, Smile, MessageSquare, Phone } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getInitials } from "@/lib/utils";
import { format } from "date-fns";
import type { Message } from "@/lib/types";

export function ChatWindow() {
  const { selectedConversation, addMessage, deleteMessage } = useConversations();
  const [message, setMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight });
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
      <div className="flex flex-col items-center justify-center h-full bg-muted/20 text-center">
        <MessageSquare className="w-16 h-16 text-muted-foreground/50" />
        <h2 className="mt-4 text-xl font-semibold">No Conversation Selected</h2>
        <p className="text-muted-foreground">Please choose a conversation from the list to start chatting.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center gap-4 p-3 border-b">
        <Avatar>
          <AvatarFallback>{getInitials(selectedConversation.customer?.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{selectedConversation.customer?.name}</h2>
          <p className="text-sm text-muted-foreground">{selectedConversation.customer?.phone}</p>
        </div>
        <Button variant="ghost" size="icon"><Phone className="w-5 h-5" /></Button>
        <Button variant="ghost" size="icon"><MoreVertical className="w-5 h-5" /></Button>
      </header>
      
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 space-y-4">
          {selectedConversation.messages.map((msg: Message) => (
            <div key={msg.id} className={`group flex items-end gap-2 ${msg.sender === 'agent' ? 'justify-end flex-row-reverse' : 'justify-start'}`}>
              <div className={`p-3 rounded-lg max-w-xl relative ${msg.sender === 'agent' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted rounded-bl-none'}`}>
                <p className="text-sm">{msg.text}</p>
                <p className="text-xs opacity-70 mt-1 text-right">{format(new Date(msg.timestamp), 'p')}</p>
              </div>
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
            </div>
          ))}
        </div>
      </ScrollArea>

      <footer className="p-4 border-t bg-background">
        <div className="relative">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={selectedConversation.customer?.is_blocked}
            className="pr-28 pl-10"
          />
          <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center">
            <Button variant="ghost" size="icon" className="h-8 w-8"><Smile className="w-5 h-5 text-muted-foreground" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"><Paperclip className="w-5 h-5 text-muted-foreground" /></Button>
          </div>
          <Button onClick={handleSend} disabled={!message.trim() || selectedConversation.customer?.is_blocked} className="absolute right-2 top-1/2 -translate-y-1/2">
            <Send className="w-4 h-4" />
          </Button>
        </div>
        {selectedConversation.customer?.is_blocked && (
          <p className="text-sm text-destructive text-center mt-2">This customer is blocked. You cannot send messages.</p>
        )}
      </footer>
    </div>
  );
}