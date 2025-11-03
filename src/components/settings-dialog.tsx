"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { AppSettings } from "@/lib/types";
import { Skeleton } from "./ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { PlusCircle, Trash2 } from "lucide-react";
import { Separator } from "./ui/separator";

const settingsSchema = z.object({
  awayMessage: z.object({
    enabled: z.boolean(),
    text: z.string().max(500, "Message cannot be longer than 500 characters."),
  }),
  businessHours: z.object({
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
    days: z.array(z.number().min(0).max(6)).min(1, "Select at least one business day."),
  }),
  welcomeMessage: z.object({
    enabled: z.boolean(),
    text: z.string().max(1024, "Welcome message cannot be longer than 1024 characters."),
    buttons: z.array(z.object({
      id: z.string(),
      title: z.string().min(1, "Button title cannot be empty.").max(20, "Button title is too long."),
    })).max(3, "You can have a maximum of 3 buttons."),
  }),
});

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [loading, setLoading] = useState(true);

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      awayMessage: { enabled: false, text: "" },
      businessHours: { start: "09:00", end: "17:00", days: [1, 2, 3, 4, 5] },
      welcomeMessage: {
        enabled: false,
        text: "Welcome! How can we help you today?",
        buttons: [{ id: 'button_1', title: 'General Inquiry' }],
      },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "welcomeMessage.buttons",
  });

  useEffect(() => {
    async function fetchSettings() {
      if (open) {
        setLoading(true);
        const { data, error } = await supabase
          .from("settings")
          .select("content")
          .eq("id", "app_settings")
          .single();

        if (error) {
          toast.error("Failed to load settings.");
          console.error(error);
        } else if (data) {
          const settings = data.content as AppSettings;
          form.reset({
            awayMessage: settings.awayMessage,
            businessHours: {
              start: settings.businessHours.start,
              end: settings.businessHours.end,
              days: settings.businessHours.days,
            },
            welcomeMessage: settings.welcomeMessage || form.getValues('welcomeMessage'),
          });
        }
        setLoading(false);
      }
    }
    fetchSettings();
  }, [open, form]);

  async function onSubmit(values: z.infer<typeof settingsSchema>) {
    const settingsPayload = {
      ...values,
      businessHours: { ...values.businessHours, timezone: "UTC" },
      welcomeMessage: {
        ...values.welcomeMessage,
        buttons: values.welcomeMessage.buttons.map((btn, i) => ({ ...btn, id: `button_${i + 1}` })),
      },
    };

    const { error } = await supabase
      .from("settings")
      .update({ content: settingsPayload })
      .eq("id", "app_settings");

    if (error) {
      toast.error("Failed to save settings.");
    } else {
      toast.success("Settings saved successfully!");
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Workspace Settings</DialogTitle>
          <DialogDescription>
            Manage automatic replies and business hours for your team.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-6 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
              <FormField
                control={form.control}
                name="welcomeMessage.enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Welcome Message</FormLabel>
                      <FormDescription>
                        Send an interactive message with buttons to new customers.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="welcomeMessage.text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Welcome Message Text</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Welcome! How can we help?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <FormLabel>Reply Buttons</FormLabel>
                <FormDescription className="mb-2">Add up to 3 quick reply buttons.</FormDescription>
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <FormField
                      key={field.id}
                      control={form.control}
                      name={`welcomeMessage.buttons.${index}.title`}
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Input {...field} placeholder={`Button ${index + 1} Title`} />
                          </FormControl>
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                  {fields.length < 3 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `new_${fields.length}`, title: '' })}>
                      <PlusCircle className="h-4 w-4 mr-2" /> Add Button
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              <FormField
                control={form.control}
                name="awayMessage.enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable Away Message</FormLabel>
                      <FormDescription>
                        Automatically reply to new conversations outside business hours.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="awayMessage.text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Away Message Text</FormLabel>
                    <FormControl>
                      <Textarea placeholder="We'll be back soon..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="businessHours.start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Hours Start</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businessHours.end"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Hours End</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="businessHours.days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Days</FormLabel>
                    <FormDescription>Select the days your team is active.</FormDescription>
                    <FormControl>
                      <Controller
                        control={form.control}
                        name="businessHours.days"
                        render={({ field: { onChange, value } }) => (
                          <ToggleGroup
                            type="multiple"
                            variant="outline"
                            value={value.map(String)}
                            onValueChange={(newValues) => onChange(newValues.map(Number))}
                            className="justify-start"
                          >
                            {WEEKDAYS.map((day, index) => (
                              <ToggleGroupItem key={index} value={String(index)} aria-label={day}>
                                {day}
                              </ToggleGroupItem>
                            ))}
                          </ToggleGroup>
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving..." : "Save Settings"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}