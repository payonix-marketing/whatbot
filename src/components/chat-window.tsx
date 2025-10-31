"use client";

import { useState, useRef, useEffect } from "react";
import { useConversations } from "../context/conversation-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MoreVertical, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Message } from "@/lib/types";

export function ChatWindow() {
  const { selectedConversation, addMessage, deleteMessage } = useConversations();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages]);

  const handleSend = () => {
    if (selectedConversation) {
      addMessage(selectedConversation.id, message);
      setMessage("");
    }
  };

  if (!selectedConversation) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20">
        <p className="text-muted-foreground">Select a conversation to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">{selectedConversation.customer?.name}</h2>
        <p className="text-sm text-muted-foreground">{selectedConversation.customer?.phone}</p>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-2 bg-muted/20">
        {selectedConversation.messages.map((msg: Message) => (
          <div key={msg.id} className={`group flex items-center gap-2 ${msg.sender === 'agent' ? 'justify-end flex-row-reverse' : 'justify-start'}`}>
            <div className={`p-3 rounded-lg max-w-md ${msg.sender === 'agent' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>
              {msg.text}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => deleteMessage(selectedConversation.id, msg.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={selectedConversation.customer?.is_blocked}
          />
          <Button onClick={handleSend} disabled={selectedConversation.customer?.is_blocked}><Send className="w-4 h-4 mr-2" /> Send</Button>
          <Button variant="outline" disabled={selectedConversation.customer?.is_blocked}>Send Template</Button>
        </div>
        {selectedConversation.customer?.is_blocked && (
          <p className="text-sm text-destructive text-center mt-2">This customer is blocked. You cannot send messages.</p>
        )}
      </div>
    </div>
  );
}