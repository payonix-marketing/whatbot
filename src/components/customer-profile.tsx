"use client";

import { useState } from "react";
import { useConversations } from "../context/conversation-context";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Agent } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { User, ShieldAlert, Pencil, Check, X } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface CustomerProfileProps {
  isCollapsed: boolean;
}

export function CustomerProfile({ isCollapsed }: CustomerProfileProps) {
  const { selectedConversation, updateConversation, agents, updateCustomer, onlineAgentIds } = useConversations();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  const handleBlockToggle = () => {
    if (!selectedConversation || !selectedConversation.customer) return;
    const isBlocked = selectedConversation.customer.is_blocked;
    updateCustomer(selectedConversation.customer.id, { is_blocked: !isBlocked });
    toast.success(`Customer has been ${!isBlocked ? 'blocked' : 'unblocked'}.`);
  };

  const handleSaveName = () => {
    if (selectedConversation?.customer && editedName.trim() && editedName !== selectedConversation.customer.name) {
      updateCustomer(selectedConversation.customer.id, { name: editedName.trim() });
      toast.success("Customer name updated.");
    }
    setIsEditingName(false);
  };

  if (isCollapsed) {
    return (
      <div className="flex flex-col h-full border-l bg-muted/30 items-center py-4 gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-10 h-10 flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Customer Profile</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  if (!selectedConversation) {
    return (
      <div className="p-4 border-l h-full flex flex-col items-center justify-center text-center bg-muted/30">
        <User className="w-16 h-16 text-muted-foreground/50" />
        <h2 className="mt-4 text-xl font-semibold">Customer Details</h2>
        <p className="text-muted-foreground">Select a conversation to see the customer's profile.</p>
      </div>
    );
  }

  return (
    <div className="h-full border-l bg-muted/30">
      <ScrollArea className="h-full">
        <div className="p-4 md:p-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-col items-center text-center p-6 space-y-2">
              <Avatar className="w-20 h-20 mb-2">
                <AvatarFallback className="text-2xl">{getInitials(selectedConversation.customer?.name)}</AvatarFallback>
              </Avatar>
              {isEditingName ? (
                <div className="flex items-center gap-2 w-full max-w-xs">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" onClick={handleSaveName}><Check className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setIsEditingName(false)}><X className="w-4 h-4" /></Button>
                </div>
              ) : (
                <div className="flex items-center gap-1 group">
                  <CardTitle>{selectedConversation.customer?.name}</CardTitle>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100"
                    onClick={() => {
                      setIsEditingName(true);
                      setEditedName(selectedConversation.customer?.name || "");
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <CardDescription>{selectedConversation.customer?.phone}</CardDescription>
              {selectedConversation.customer?.is_blocked && <Badge variant="destructive" className="mt-2">Blocked</Badge>}
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={selectedConversation.status}
                  onValueChange={(value) => updateConversation(selectedConversation.id, { status: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Set status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="mine">Mine</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assign to</Label>
                <Select
                  value={selectedConversation.agent_id || 'unassigned'}
                  onValueChange={(value) => {
                    const newAgentId = value === 'unassigned' ? null : value;
                    updateConversation(selectedConversation.id, { agent_id: newAgentId });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {agents.map((agent: Agent) => {
                      const isOnline = onlineAgentIds.includes(agent.id);
                      return (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span>{agent.name || 'Unnamed Agent'}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="internal-notes"
                placeholder="Add a note for your team..."
                className="mt-1 min-h-[100px]"
                value={selectedConversation.internal_notes || ''}
                onChange={(e) => updateConversation(selectedConversation.id, { internal_notes: e.target.value })}
              />
            </CardContent>
          </Card>

          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-destructive"><ShieldAlert className="w-5 h-5" /> Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-destructive/80 mb-4">
                {selectedConversation.customer?.is_blocked ? "Unblocking will allow this customer to send messages again." : "Blocking this customer will prevent them from sending you messages."}
              </p>
              <Button
                className="w-full"
                variant={selectedConversation.customer?.is_blocked ? "secondary" : "destructive"}
                onClick={handleBlockToggle}
              >
                {selectedConversation.customer?.is_blocked ? "Unblock Customer" : "Block Customer"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}