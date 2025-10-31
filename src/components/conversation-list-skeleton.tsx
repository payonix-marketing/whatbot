"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ConversationListSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Skeleton className="h-7 w-24" />
      </div>
      <div className="p-4">
        <Skeleton className="h-9 w-full" />
      </div>
      <div className="flex-1 p-3 space-y-3 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-1/5" />
              </div>
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        ))}
      </div>
      <div className="p-2 border-t">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    </div>
  );
}