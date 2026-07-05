'use client';

import {
  LayoutDashboard,
  SquarePen,
  ListOrdered,
  Bot,
  BarChart3,
  Link2,
  Settings,
  Building2,
  CalendarDays,
  ImageIcon,
  ClipboardCheck,
  CheckCircle2,
  Users,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { cn } from '@/lib/utils';

const mainNav = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'New Post', href: '/dashboard/new-post', icon: SquarePen },
  { label: 'Queue', href: '/dashboard/queue', icon: ListOrdered },
  { label: 'Automation', href: '/dashboard/automation', icon: Bot },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Social Accounts', href: '/dashboard/social', icon: Link2 },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const secondarySections = [
  {
    title: 'Workspace',
    items: [
      { label: 'Brands', href: '/dashboard/brands', icon: Building2 },
      { label: 'Calendar', href: '/dashboard/calendar', icon: CalendarDays },
      { label: 'Assets', href: '/dashboard/assets', icon: ImageIcon },
      { label: 'Approval', href: '/dashboard/approval', icon: ClipboardCheck },
      { label: 'Posted', href: '/dashboard/posted', icon: CheckCircle2 },
      { label: 'Teams', href: '/dashboard/teams', icon: Users },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside className="hidden w-56 flex-col border-r bg-sidebar md:flex">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>AutoPost Agent</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {mainNav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="mt-6 space-y-4">
          {secondarySections.map((section) => {
            const isCollapsed = collapsed[section.title] ?? false;
            return (
              <div key={section.title}>
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  className="mb-1 flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent"
                >
                  {section.title}
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 transition-transform',
                      isCollapsed ? '' : 'rotate-180',
                    )}
                  />
                </button>
                {!isCollapsed && (
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(item.href + '/');
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            active
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                              : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
