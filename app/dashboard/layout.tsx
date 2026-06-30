import { Navbar } from '@/components/navbar';
import { Sidebar } from '@/components/sidebar';
import { ModeProvider } from '@/hooks/use-mode';
import { ActiveTeamProvider } from '@/hooks/use-team';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ModeProvider>
      <ActiveTeamProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
      </ActiveTeamProvider>
    </ModeProvider>
  );
}
