'use client';

import {
  LayoutDashboard,
  Building2,
  Sparkles,
  ListOrdered,
  CheckCircle2,
  Settings,
  ImageIcon,
  CalendarDays,
  BarChart3,
  Image,
  Link2,
  Bot,
  ClipboardCheck,
  Users,
  TrendingUp,
  Search,
  WandSparkles,
  ScrollText,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { useMode } from '@/hooks/use-mode';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href?: string;
  icon: typeof LayoutDashboard;
  quick: boolean;
  getHref?: (mode: string) => string;
}

interface NavSection {
  title: string;
  icon?: typeof LayoutDashboard;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    title: 'Main Navigation',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, quick: true },
      { label: 'Create', href: '/dashboard/create', icon: WandSparkles, quick: true },
      { label: 'Calendar', href: '/dashboard/calendar', icon: CalendarDays, quick: true },
      { label: 'Queue', href: '/dashboard/queue', icon: ListOrdered, quick: true },
      { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3, quick: false },
    ],
  },
  {
    title: 'AI',
    items: [
      {
        label: 'Generate', icon: Sparkles, quick: true,
        getHref: (mode: string) => mode === 'quick' ? '/dashboard/quick' : '/dashboard/generate',
      },
      { label: 'Research', href: '/dashboard/research', icon: TrendingUp, quick: true },
      { label: 'Competitors', href: '/dashboard/competitor', icon: Search, quick: true },
      { label: 'Image Engine', href: '/dashboard/image-engine', icon: Image, quick: true },
      { label: 'Script', href: '/dashboard/script', icon: ScrollText, quick: true },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Assets', href: '/dashboard/assets', icon: ImageIcon, quick: false },
      { label: 'Approval', href: '/dashboard/approval', icon: ClipboardCheck, quick: true },
      { label: 'Posted', href: '/dashboard/posted', icon: CheckCircle2, quick: true },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { label: 'Brands', href: '/dashboard/brands', icon: Building2, quick: false },
      { label: 'Social', href: '/dashboard/social', icon: Link2, quick: true },
      { label: 'Automation', href: '/dashboard/automation', icon: Bot, quick: true },
      { label: 'Teams', href: '/dashboard/teams', icon: Users, quick: true },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings, quick: false },
    ],
  },
];

function SidebarNavItem({ item, collapsed }: { item: NavItem; collapsed?: boolean }) {
  const pathname = usePathname();
  const { mode } = useMode();

  const href = item.getHref ? item.getHref(mode) : item.href!;
  const active = pathname === href;
  const Icon = item.icon;

  if (collapsed) {
    return (
      <Link
        href={href}
        title={item.label}
        className={cn(
          'flex items-center justify-center rounded-lg p-2 transition-colors',
          active
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
        )}
      >
        <Icon className="h-5 w-5" />
      </Link>
    );
  }

  return (
    <Link
      href={href}
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
}

export function Sidebar() {
  const { mode } = useMode();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    'AI': false,
    'Content': false,
    'Workspace': false,
  });

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const filteredSections = sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => mode === 'pro' || item.quick),
  })).filter((section) => section.items.length > 0);

  return (
    <aside className="hidden w-56 flex-col border-r bg-sidebar md:flex">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-5 w-5 text-primary" />
          <span>AutoPost Agent</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        {filteredSections.map((section) => {
          const isMain = section.title === 'Main Navigation';
          const isCollapsed = collapsedSections[section.title] ?? false;
          return (
            <div key={section.title} className="mb-4">
              {isMain ? (
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <SidebarNavItem key={item.label} item={item} />
                  ))}
                </div>
              ) : (
                <>
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
                      {section.items.map((item) => (
                        <SidebarNavItem key={item.label} item={item} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
