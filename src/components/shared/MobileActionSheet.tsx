'use client';

import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export interface MobileActionSheetAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

export interface MobileActionSheetProps {
  trigger: React.ReactNode;
  actions: MobileActionSheetAction[];
  title?: string;
}

export function MobileActionSheet({
  trigger,
  actions,
  title = 'Actions',
}: MobileActionSheetProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-1">
            {actions.map((action, index) => (
              <button
                key={index}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  action.variant === 'destructive'
                    ? 'text-destructive hover:bg-destructive/10'
                    : 'text-foreground hover:bg-muted'
                )}
                onClick={() => {
                  action.onClick();
                }}
              >
                {action.icon && <span className="flex-shrink-0">{action.icon}</span>}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
          <DrawerClose asChild>
            <Button variant="outline" className="mx-4 mb-4">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: render as dropdown menu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {actions.map((action, index) => (
          <DropdownMenuItem
            key={index}
            variant={action.variant}
            onClick={action.onClick}
            className="flex items-center gap-2"
          >
            {action.icon && <span className="flex-shrink-0">{action.icon}</span>}
            <span>{action.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
