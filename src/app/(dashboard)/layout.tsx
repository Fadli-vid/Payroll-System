import { AppShell } from "@/src/components/layout/app-shell";
import { SessionProvider } from "@/src/components/providers/session-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
