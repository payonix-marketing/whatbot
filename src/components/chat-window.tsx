"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ChatWindow() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">John Doe</h2>
        <p className="text-sm text-muted-foreground">+15551234567</p>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-muted/20">
        <div className="flex justify-start">
          <div className="p-3 rounded-lg bg-background max-w-xs">
            Hello, I have a question about my order.
          </div>
        </div>
        <div className="flex justify-end">
          <div className="p-3 text-primary-foreground rounded-lg bg-primary max-w-xs">
            Hi John, I can help with that. What is your order number?
          </div>
        </div>
      </div>
      <div className="p-4 border-t bg-background">
        <div className="flex gap-2">
          <Input placeholder="Type a message..." />
          <Button>Send</Button>
          <Button variant="outline">Send Template</Button>
        </div>
      </div>
    </div>
  );
}