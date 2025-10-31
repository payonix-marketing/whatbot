"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function CustomerProfile() {
  return (
    <div className="p-4 border-l h-full">
      <h2 className="text-xl font-semibold">Customer Profile</h2>
      <div className="mt-4 space-y-4">
        <div>
          <Label>Phone Number</Label>
          <p className="text-sm text-muted-foreground">+15551234567</p>
        </div>
        <div>
          <Label>Status</Label>
          <Select defaultValue="mine">
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
           <Select defaultValue="agent-1">
            <SelectTrigger>
              <SelectValue placeholder="Assign agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agent-1">Alice</SelectItem>
              <SelectItem value="agent-2">Bob</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="internal-notes">Internal Notes</Label>
          <Textarea id="internal-notes" placeholder="Add a note..." className="mt-1" />
        </div>
        <Button className="w-full">Save Note</Button>
      </div>
    </div>
  );
}