"use client";

import type { LucideIcon } from "lucide-react";
import { Card } from "@/src/components/ui/card";
import { cn } from "@/src/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  iconClassName?: string;
}

export function StatCard({ icon: Icon, label, value, iconClassName }: StatCardProps) {
  return (
    <Card className="p-4 flex-row items-center gap-4">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary",
          iconClassName
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-bold truncate">{value}</p>
      </div>
    </Card>
  );
}
