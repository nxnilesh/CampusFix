import React from 'react';
import { IssuePriority } from '../../types';

interface PriorityBadgeProps {
  priority: IssuePriority | string;
  showSubtext?: boolean;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  showSubtext = false,
  size = 'md',
}) => {
  const isHigh = priority === 'High';
  const isMedium = priority === 'Medium';

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  if (isHigh) {
    return (
      <span
        className={`priority-badge priority-high inline-flex items-center gap-1.5 rounded-full font-mono font-bold uppercase tracking-wider whitespace-nowrap ${sizeClasses}`}
        title="High Priority: Immediate safety concern"
      >
        <span className="priority-badge-dot w-1.5 h-1.5 rounded-full" />
        <span>HIGH</span>
        {showSubtext && <span className="opacity-80 text-[10px] lowercase font-sans font-normal">— safety alert</span>}
      </span>
    );
  }

  if (isMedium) {
    return (
      <span
        className={`priority-badge priority-medium inline-flex items-center gap-1.5 rounded-full font-mono font-bold uppercase tracking-wider whitespace-nowrap ${sizeClasses}`}
        title="Medium Priority: Operational disruption"
      >
        <span className="priority-badge-dot w-1.5 h-1.5 rounded-full" />
        <span>MED</span>
        {showSubtext && <span className="opacity-80 text-[10px] lowercase font-sans font-normal">— disruption</span>}
      </span>
    );
  }

  return (
    <span
      className={`priority-badge priority-low inline-flex items-center gap-1.5 rounded-full font-mono font-bold uppercase tracking-wider whitespace-nowrap ${sizeClasses}`}
      title="Low Priority: Minor defect"
    >
      <span className="priority-badge-dot w-1.5 h-1.5 rounded-full" />
      <span>LOW</span>
      {showSubtext && <span className="opacity-80 text-[10px] lowercase font-sans font-normal">— minor</span>}
    </span>
  );
};
