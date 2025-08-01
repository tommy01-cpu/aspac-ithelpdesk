'use client';

import React from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AdminSettingsButtonProps {
  onClick: () => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showText?: boolean;
}

export function AdminSettingsButton({ 
  onClick, 
  className = '', 
  variant = 'outline',
  size = 'default',
  showText = false 
}: AdminSettingsButtonProps) {
  const buttonContent = (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={`${className} transition-all duration-200 hover:shadow-md`}
    >
      <Settings className={`w-4 h-4 ${showText ? 'mr-2' : ''}`} />
      {showText && 'Settings'}
    </Button>
  );

  if (showText) {
    return buttonContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {buttonContent}
        </TooltipTrigger>
        <TooltipContent>
          <p>Open Admin Settings</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
