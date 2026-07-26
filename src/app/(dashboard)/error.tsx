"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <Card className="max-w-md border-destructive/30">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div>
            <p className="font-semibold">Terjadi kesalahan pada halaman ini</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Silakan coba muat ulang. Jika masalah berlanjut, hubungi
              administrator sistem.
            </p>
          </div>
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Coba Lagi
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
