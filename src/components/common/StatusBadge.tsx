import React from 'react';
import { IssueStatus } from '../../types';

interface StatusBadgeProps {
  status: IssueStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
    lg: 'px-3.5 py-1.5 text-xs',
  };
  const statusClass = status.toLowerCase().replace(/\s+/g, '-');
  return (
    <span className={`status-badge status-${statusClass} inline-flex items-center gap-1.5 rounded-full font-mono font-bold uppercase tracking-wider whitespace-nowrap ${sizeClasses[size]}`}>
      <span className="status-badge-dot w-1.5 h-1.5 rounded-full" />
      <span>{status}</span>
    </span>
  );
};
