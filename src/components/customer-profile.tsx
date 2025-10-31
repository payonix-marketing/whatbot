"use client";

import { useConversations } from "../context/conversation-context";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
  const { selectedConversation, updateConversation, agents } = useConversations();

  const handleNoteSave = () => {
    // The note is already saved on change, this is for user feedback
    toast.success("Note saved!");
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
      <h2 className="text-xl font-semibold">Customer Profile</h2>
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
            value={selectedConversation.agentId}
            onValueChange={(value) => updateConversation(selectedConversation.id, { agentId: value })}
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
            value={selectedConversation.internalNotes}
            onChange={(e) => updateConversation(selectedConversation.id, { internalNotes: e.target.value })}
          />
        </div>
        <Button className="w-full" onClick={handleNoteSave}>Save Note</Button>
      </div>
    </div>
  );
}