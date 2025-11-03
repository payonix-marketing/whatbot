"use client";

import React, { useState, useRef, useEffect } from "react";
import { useConversations } from "../context/conversation-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MoreVertical, Trash2, Paperclip, Smile, MessageSquare, Phone, ArrowLeft, User, File as FileIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getInitials } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import type { Message } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CustomerProfile } from "./customer-profile";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useTypingIndicator } from "@/hooks/use-typing-indicator";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";

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
  const { selectedConversation, addMessage, deleteMessage, sendAttachment, setSelectedConversationId, cannedResponses } = useConversations();
  const [message, setMessage] = useState("");
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const { typingUsers, startTyping } = useTypingIndicator(selectedConversation?.id || null);
  const { theme } = useTheme();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [selectedConversation?.messages, typingUsers]);

  useEffect(() => {
    setShowCannedResponses(message.startsWith('/'));
  }, [message]);

  const handleSend = () => {
    if (selectedConversation && message.trim()) {
      addMessage(selectedConversation.id, message);
      setMessage("");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    startTyping();
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedConversation) {
      sendAttachment(selectedConversation.id, file, message);
      setMessage("");
    }
    // Reset file input
    if(e.target) e.target.value = "";
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
            const attachment = msg.attachment;

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
                  <div className={`p-2 rounded-2xl max-w-md md:max-w-lg relative ${msg.sender === 'agent' ? 'bg-primary text-primary-foreground rounded-br-lg' : 'bg-muted rounded-bl-lg'}`}>
                    {attachment ? (
                      <div className="p-1">
                        {attachment.fileType.startsWith('image/') ? (
                          <img src={attachment.url} alt={attachment.fileName} className="max-w-xs rounded-lg cursor-pointer" onClick={() => window.open(attachment.url, '_blank')} />
                        ) : attachment.fileType.startsWith('audio/') ? (
                          <audio controls src={attachment.url} className="w-64" />
                        ) : (
                          <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-background/20 rounded-lg">
                            <FileIcon className="w-6 h-6" />
                            <span className="truncate">{attachment.fileName}</span>
                          </a>
                        )}
                        {msg.text && <p className="text-sm whitespace-pre-wrap mt-2">{msg.text}</p>}
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap px-1">{msg.text}</p>
                    )}
                    <p className="text-xs opacity-70 mt-1 text-right px-1">{format(new Date(msg.timestamp), 'p')}</p>
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
          {typingUsers.length > 0 && (
            <div className="flex items-end gap-2 justify-start">
              <div className="p-3 rounded-2xl max-w-md md:max-w-lg bg-muted rounded-bl-lg animate-pulse">
                <p className="text-sm text-muted-foreground italic">
                  {typingUsers.map(u => u.name).join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <footer className="p-3 border-t bg-background">
        <Popover open={showCannedResponses} onOpenChange={setShowCannedResponses}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Input
                placeholder="Type a message or / for canned responses..."
                value={message}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !showCannedResponses) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={selectedConversation.customer?.is_blocked}
                className="pr-28 pl-10 h-10"
              />
              <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Smile className="w-5 h-5 text-muted-foreground" /></Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 border-0">
                    <EmojiPicker onEmojiClick={handleEmojiClick} theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT} />
                  </PopoverContent>
                </Popover>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleAttachmentClick}><Paperclip className="w-5 h-5 text-muted-foreground" /></Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              </div>
              <Button onClick={handleSend} disabled={!message.trim() || selectedConversation.customer?.is_blocked} className="absolute right-2 top-1/2 -translate-y-1/2">
                <Send className="w-4 h-4 mr-2" /> Send
              </Button>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search canned responses..." />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {cannedResponses.map((response) => (
                    <CommandItem
                      key={response.id}
                      value={response.shortcut}
                      onSelect={() => {
                        setMessage(response.message);
                        setShowCannedResponses(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold">{response.shortcut}</span>
                        <span className="text-muted-foreground text-xs">{response.message}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {selectedConversation.customer?.is_blocked && (
          <p className="text-sm text-destructive text-center mt-2">This customer is blocked. You cannot send messages.</p>
        )}
      </footer>
    </div>
  );
}