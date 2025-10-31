"use client";

import { useConversations } from "../context/conversation-context";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { User, ShieldAlert } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

export function CustomerProfile() {
  const { selectedConversation, updateConversation, agents, updateCustomer } = useConversations();

  const handleBlockToggle = () => {
    if (!selectedConversation || !selectedConversation.customer) return;
    const isBlocked = selectedConversation.customer.is_blocked;
    updateCustomer(selectedConversation.customer.id, { is_blocked: !isBlocked });
    toast.success(`Customer has been ${!isBlocked ? 'blocked' : 'unblocked'}.`);
  };

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
    <ScrollArea className="h-full border-l bg-muted/30">
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="flex flex-col items-center text-center">
            <Avatar className="w-20 h-20 mb-2">
              <AvatarFallback className="text-2xl">{getInitials(selectedConversation.customer?.name)}</AvatarFallback>
            </Avatar>
            <CardTitle>{selectedConversation.customer?.name}</CardTitle>
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
                  {agents.map((agent: Agent) => (
                    <SelectItem key={agent.id} value={agent.id}>{agent.name || 'Unnamed Agent'}</SelectItem>
                  ))}
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
  );
}