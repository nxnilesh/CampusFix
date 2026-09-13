import React from 'react';

interface BrandLogoProps {
  compact?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ compact = false, className = '' }) => {
  return (
    <span className={`brand-logo ${compact ? 'brand-logo-compact' : ''} ${className}`.trim()}>
      <span className="brand-logo-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" role="presentation">
          <path className="brand-logo-building" d="M6 25V11l10-5 10 5v14H6Z" />
          <path className="brand-logo-arch" d="M11 25v-7h10v7M9 13h14M12 13v3m4-3v3m4-3v3" />
          <path className="brand-logo-check" d="m19 20 2 2 5-6" />
        </svg>
        <span className="brand-logo-spark" />
      </span>
      {!compact && (
        <span className="brand-logo-copy">
          <span className="brand-logo-name">CampusFix</span>
          <span className="brand-logo-subtitle">Smart campus reporting</span>
        </span>
      )}
    </span>
  );
};