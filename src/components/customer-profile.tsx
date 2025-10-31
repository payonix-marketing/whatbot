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
      <div className="p-4 border-l h-full flex items-center justify-center">
         <p className="text-muted-foreground">Select a conversation to see details</p>
      </div>
    );
  }

  return (
    <div className="p-4 border-l h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Customer Profile</h2>
        {selectedConversation.customer?.is_blocked && <Badge variant="destructive">Blocked</Badge>}
      </div>
      <div className="mt-4 space-y-4">
        <div>
          <Label>Phone Number</Label>
          <p className="text-sm text-muted-foreground">{selectedConversation.customer?.phone}</p>
        </div>
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
            value={selectedConversation.agent_id || ''}
            onValueChange={(value) => updateConversation(selectedConversation.id, { agent_id: value })}
           >
            <SelectTrigger>
              <SelectValue placeholder="Assign agent" />
            </SelectTrigger>
            <SelectContent>
              {agents.map((agent: Agent) => (
                <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="internal-notes">Internal Notes</Label>
          <Textarea
            id="internal-notes"
            placeholder="Add a note..."
            className="mt-1"
            value={selectedConversation.internal_notes || ''}
            onChange={(e) => updateConversation(selectedConversation.id, { internal_notes: e.target.value })}
          />
        </div>
        <Button
          className="w-full"
          variant={selectedConversation.customer?.is_blocked ? "secondary" : "destructive"}
          onClick={handleBlockToggle}
        >
          {selectedConversation.customer?.is_blocked ? "Unblock Customer" : "Block Customer"}
        </Button>
      </div>
    </div>
  );
}