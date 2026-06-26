'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { ActiveSection, Permission, UserRole } from '@/types/qms';
import { rolePermissions } from '@/types/qms';
import {
  LayoutDashboard,
  FileText,
  Shield,
  GraduationCap,
  MoreHorizontal,
  AlertTriangle,
  ClipboardCheck,
  BarChart3,
  ArrowLeftRight,
  AlertOctagon,
  Package,
  Truck,
  FlaskConical,
  FileSpreadsheet,
  GitBranch,
  PieChart,
  CheckCircle2,
  Users,
  Settings,
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  id: ActiveSection;
  label: string;
  icon: React.ElementType;
  /** If set, this item is only visible to users with this permission */
  requiredPermission?: string;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'capa', label: 'CAPA', icon: Shield },
  { id: 'training', label: 'Training', icon: GraduationCap },
];

const MORE_NAV_ITEMS: { group: string; items: NavItem[] }[] = [
  {
    group: 'Records',
    items: [
      { id: 'ncr', label: 'NCR', icon: AlertTriangle },
      { id: 'audits', label: 'Audits', icon: ClipboardCheck },
      { id: 'risks', label: 'Risks', icon: BarChart3 },
      { id: 'change-control', label: 'Change Control', icon: ArrowLeftRight },
      { id: 'deviations', label: 'Deviations', icon: AlertOctagon },
      { id: 'batch-records', label: 'Batch Records', icon: Package },
      { id: 'suppliers', label: 'Suppliers', icon: Truck },
      { id: 'oos-oot', label: 'OOS/OOT', icon: FlaskConical },
      { id: 'forms', label: 'Forms', icon: FileSpreadsheet },
    ],
  },
  {
    group: 'Documents',
    items: [
      { id: 'document-hierarchy', label: 'Doc Hierarchy', icon: GitBranch },
    ],
  },
  {
    group: 'Governance',
    items: [
      { id: 'reports', label: 'Reports', icon: PieChart },
      { id: 'compliance', label: 'Compliance', icon: CheckCircle2 },
    ],
  },
  {
    group: 'Paramètres',
    items: [
      { id: 'settings', label: 'Paramètres', icon: Settings, requiredPermission: 'admin.settings' },
      { id: 'user-management', label: 'Utilisateurs', icon: Users },
    ],
  },
];

interface MobileBottomNavProps {
  activeSection: string;
  onSectionChange: (section: ActiveSection) => void;
}

export function MobileBottomNav({ activeSection, onSectionChange }: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { hasPermission: ctxHasPermission, currentUser } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false;
    const perms = rolePermissions[currentUser.role as UserRole] || [];
    return perms.includes(permission as Permission);
  };

  const isPrimaryActive = (id: string) => activeSection === id;
  const isMoreActive = () =>
    !PRIMARY_NAV_ITEMS.some((item) => item.id === activeSection);

  const handleSectionChange = (section: ActiveSection) => {
    onSectionChange(section);
    setMoreOpen(false);
  };

  // Check if settings is accessible
  const canAccessSettings = hasPermission('admin.settings');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-1">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isPrimaryActive(item.id);
          return (
            <button
              key={item.id}
              onClick={() => handleSectionChange(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors rounded-lg',
                active
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', active && 'text-primary')} />
              <span className={cn('text-[10px] font-medium', active && 'text-primary')}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Settings direct access — visible for admin on mobile */}
        {canAccessSettings && (
          <button
            onClick={() => handleSectionChange('settings')}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors rounded-lg',
              activeSection === 'settings'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Settings className={cn('h-5 w-5', activeSection === 'settings' && 'text-primary')} />
            <span className={cn('text-[10px] font-medium', activeSection === 'settings' && 'text-primary')}>
              Paramètres
            </span>
          </button>
        )}

        {/* More button opens drawer */}
        <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
          <DrawerTrigger asChild>
            <button
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors rounded-lg',
                isMoreActive() && !canAccessSettings
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MoreHorizontal className={cn('h-5 w-5', isMoreActive() && !canAccessSettings && 'text-primary')} />
              <span className={cn('text-[10px] font-medium', isMoreActive() && !canAccessSettings && 'text-primary')}>
                More
              </span>
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Toutes les Sections</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-8 max-h-[70vh] overflow-y-auto space-y-4">
              {MORE_NAV_ITEMS.map((group) => {
                // Filter items by permission
                const visibleItems = group.items.filter(item => {
                  if (item.requiredPermission) {
                    return hasPermission(item.requiredPermission);
                  }
                  return true;
                });
                if (visibleItems.length === 0) return null;

                return (
                  <div key={group.group}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {group.group}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {visibleItems.map((item) => {
                        const Icon = item.icon;
                        const active = activeSection === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSectionChange(item.id)}
                            className={cn(
                              'flex flex-col items-center gap-1.5 p-3 rounded-lg transition-colors text-center',
                              active
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-muted text-foreground'
                            )}
                          >
                            <Icon className="h-5 w-5" />
                            <span className="text-xs font-medium truncate w-full">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <Separator className="mt-3" />
                  </div>
                );
              })}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </nav>
  );
}
