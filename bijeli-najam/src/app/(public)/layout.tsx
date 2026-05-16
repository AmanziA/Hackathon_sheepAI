import { AppShell } from "@/components/domain/app-shell";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
