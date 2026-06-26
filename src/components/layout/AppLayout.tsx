'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { SetupWizard } from '@/components/setup/SetupWizard';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import { useI18n } from '@/lib/i18n';
import type { ActiveSection, OrgSettings } from '@/types/qms';
import {
  Bell,
  ChevronDown,
  LogOut,
  User,
  Menu,
  Globe,
  Settings,
} from 'lucide-react';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { MobileBottomNav } from '@/components/shared/MobileBottomNav';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useQMSStore } from '@/lib/demo-store';

interface AppLayoutProps {
  children: (activeSection: ActiveSection) => React.ReactNode;
}

function AppLayoutInner({ children }: AppLayoutProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { currentUser, logout, switchUser, hasPermission } = useAuth();
  const { currentOrg, orgSettings, updateSettings } = useOrganization();
  const { locale, setLocale, t } = useI18n();
  const storeUpdateOrganization = useQMSStore(state => state.updateOrganization);
  const profiles = useQMSStore(state => state.profiles);
  const capas = useQMSStore(state => state.capas);
  const ncrs = useQMSStore(state => state.ncrs);
  const training = useQMSStore(state => state.training);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileSidebarOpen]);

  // Check if setup wizard should be shown
  const showSetupWizard = useMemo(() => {
    if (!currentOrg) return false;
    return orgSettings?.setup_completed === false;
  }, [currentOrg, orgSettings]);

  const handleSetupComplete = (settings: Partial<OrgSettings>, orgName: string) => {
    // Update org settings
    updateSettings(settings);
    // Update org name
    if (currentOrg) {
      storeUpdateOrganization(currentOrg.id, { name: orgName });
    }
  };

  const overdueCount = [
    ...capas.filter(c => c.status !== 'Closed' && new Date(c.dueDate) < new Date()),
    ...ncrs.filter(n => n.status !== 'Closed'),
    ...training.filter(t => t.status === 'Overdue'),
  ].length;

  const userInitials = currentUser?.fullName
    ? currentUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase()
    : currentUser?.email?.[0]?.toUpperCase() || 'U';

  // Show SetupWizard if setup is not completed
  if (showSetupWizard) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar — always visible on lg+ */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar — slide-in overlay */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300 ease-in-out',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          collapsed={false}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          isMobile
          onClose={() => setMobileSidebarOpen(false)}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b bg-background flex items-center justify-between px-3 md:px-4 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden flex-shrink-0"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="text-base md:text-lg font-semibold text-foreground truncate">
              {t.sections[activeSection as keyof typeof t.sections] || activeSection.replace(/-/g, ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
            {/* Settings button — mobile only, visible for admin */}
            {hasPermission('admin.settings') && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9"
                onClick={() => setActiveSection('settings')}
              >
                <Settings className="h-5 w-5" />
              </Button>
            )}

            {/* Global Search — hidden on very small screens */}
            <div className="hidden sm:block">
              <GlobalSearch onNavigate={(section) => { setActiveSection(section); setMobileSidebarOpen(false); }} />
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="h-4 w-4" />
              {overdueCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center px-1">
                  {overdueCount}
                </span>
              )}
            </Button>

            {/* Locale Switcher */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocale(locale === 'en' ? 'fr' : 'en')}
              className="flex items-center gap-1 h-9 px-2"
              title={locale === 'en' ? 'Switch to French' : 'Passer en Anglais'}
            >
              <Globe className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">{locale}</span>
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={currentUser?.avatarUrl} />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium">{currentUser?.fullName || 'User'}</span>
                    <span className="text-xs text-muted-foreground">{currentOrg?.name || 'Organization'}</span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{currentUser?.fullName}</span>
                    <span className="text-xs text-muted-foreground">{currentUser?.email}</span>
                    <Badge variant="outline" className="mt-1 w-fit text-xs capitalize">
                      {currentUser?.role?.replace('_', ' ')}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">{t.auth.switchUser} ({t.auth.demoMode})</DropdownMenuLabel>
                {profiles.filter(p => p.id !== currentUser?.id).map(p => (
                  <DropdownMenuItem key={p.id} onClick={() => switchUser(p.id)}>
                    <User className="mr-2 h-4 w-4" />
                    <span>{p.fullName} ({p.role.replace('_', ' ')})</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t.auth.logout}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content area — scrollable; extra padding on mobile for bottom nav */}
        <main className="flex-1 overflow-y-auto overscroll-contain pb-14 lg:pb-0">
          {children(activeSection)}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav activeSection={activeSection} onSectionChange={setActiveSection} />
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  // AuthProvider and OrganizationProvider are now in root layout.tsx
  return <AppLayoutInner>{children}</AppLayoutInner>;
}
