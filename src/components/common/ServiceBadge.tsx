import React from 'react';
import { ServiceId } from '../../types';
import { SERVICES_CONFIG } from '../../config/services';

interface ServiceBadgeProps {
  service: ServiceId;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export const ServiceBadge: React.FC<ServiceBadgeProps> = ({
  service,
  size = 'sm',
  showLabel = false,
  className = '',
}) => {
  const config = SERVICES_CONFIG[service];
  if (!config) return null;

  const sizeClasses = {
    xs: 'w-4 h-4 text-[9px]',
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-6 h-6 text-xs',
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        title={config.name}
        className={`inline-flex items-center justify-center font-bold tracking-tight rounded-md select-none shrink-0 ${sizeClasses[size]}`}
        style={{
          backgroundColor: config.brandColor,
          color: '#FFFFFF',
        }}
      >
        {config.badgeLabel}
      </span>
      {showLabel && (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {config.name}
        </span>
      )}
    </div>
  );
};
