"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useConversations } from "@/context/conversation-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ScrollArea } from "./ui/scroll-area";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const formSchema = z.object({
  shortcut: z.string().min(1, "Shortcut cannot be empty.").refine(s => !s.includes(" "), "Shortcut cannot contain spaces."),
  message: z.string().min(1, "Message cannot be empty."),
});

type CannedResponsesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CannedResponsesDialog({ open, onOpenChange }: CannedResponsesDialogProps) {
  const { cannedResponses, addCannedResponse, deleteCannedResponse } = useConversations();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shortcut: "",
      message: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const shortcut = values.shortcut.startsWith('/') ? values.shortcut : `/${values.shortcut}`;
      await addCannedResponse(shortcut, values.message);
      toast.success("Canned response added!");
      form.reset();
    } catch (error) {
      // Error is already toasted in the context
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Canned Responses</DialogTitle>
          <DialogDescription>
            Create, view, and delete reusable message templates.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 grid md:grid-cols-2 gap-6 overflow-hidden">
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold mb-2">Add New Response</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="shortcut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shortcut</FormLabel>
                      <FormControl>
                        <Input placeholder="/greeting" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Type your message here..." {...field} className="h-32" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Adding..." : "Add Response"}
                </Button>
              </form>
            </Form>
          </div>
          <div className="flex flex-col overflow-hidden">
            <h3 className="text-lg font-semibold mb-2">Existing Responses</h3>
            <ScrollArea className="flex-1 pr-4 border rounded-lg">
              <div className="p-2 space-y-2">
                {cannedResponses.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No canned responses yet.</p>
                )}
                {cannedResponses.map(response => (
                  <div key={response.id} className="p-3 rounded-md bg-muted/50 flex justify-between items-start">
                    <div>
                      <p className="font-mono font-semibold text-sm text-primary">{response.shortcut}</p>
                      <p className="text-sm text-muted-foreground mt-1">{response.message}</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the canned response for <span className="font-semibold">{response.shortcut}</span>. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteCannedResponse(response.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}