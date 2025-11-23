/**
 * TrustIndicator Component
 *
 * Displays security status, SIPC insurance, and platform trust signals
 * Part of Indigo Yield Platform Design System v2.0 - "Sophisticated Simplicity"
 *
 * @example
 * <TrustIndicator
 *   status="secure"
 *   insuranceAmount={500000}
 *   lastVerified={new Date()}
 * />
 */

import React from 'react';
import { Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TrustIndicatorProps {
  /**
   * Security status of the platform
   * - secure: All systems operational, fully encrypted
   * - warning: Minor issues detected, verification in progress
   * - offline: Connection issues, reconnecting
   */
  status: 'secure' | 'warning' | 'offline';

  /**
   * SIPC insurance coverage amount (defaults to $500,000)
   */
  insuranceAmount?: number;

  /**
   * Last security verification timestamp
   */
  lastVerified?: Date;

  /**
   * Show detailed security information
   */
  showDetails?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const TrustIndicator: React.FC<TrustIndicatorProps> = ({
  status = 'secure',
  insuranceAmount = 500000,
  lastVerified,
  showDetails = false,
  className
}) => {
  // Status-based styling configuration
  const statusConfig = {
    secure: {
      icon: Shield,
      color: 'hsl(var(--indigo-primary))',
      bgColor: 'hsl(var(--indigo-surface))',
      textColor: 'hsl(var(--slate-700))',
      animation: 'animate-pulse-slow',
      message: `SIPC Insured • $${insuranceAmount.toLocaleString('en-US')}`
    },
    warning: {
      icon: AlertTriangle,
      color: 'hsl(var(--amber-caution))',
      bgColor: 'hsl(var(--coral-surface))',
      textColor: 'hsl(var(--slate-700))',
      animation: '',
      message: 'Verifying Security...'
    },
    offline: {
      icon: RefreshCw,
      color: 'hsl(var(--slate-500))',
      bgColor: 'hsl(var(--slate-100))',
      textColor: 'hsl(var(--slate-500))',
      animation: 'animate-spin',
      message: 'Reconnecting...'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  // Format last verified time
  const getVerifiedText = () => {
    if (!lastVerified) return null;

    const now = new Date();
    const diffMs = now.getTime() - lastVerified.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return lastVerified.toLocaleDateString();
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300",
        className
      )}
      style={{ backgroundColor: config.bgColor }}
      role="status"
      aria-live="polite"
      aria-label={`Security status: ${status}`}
    >
      {/* Status Icon */}
      <Icon
        className={cn(
          "w-4 h-4 transition-all duration-300",
          config.animation
        )}
        style={{ color: config.color }}
        aria-hidden="true"
      />

      {/* Status Message */}
      <span
        className="text-xs font-medium transition-colors duration-300"
        style={{ color: config.textColor }}
      >
        {config.message}
      </span>

      {/* Detailed Information (optional) */}
      {showDetails && status === 'secure' && (
        <span
          className="text-xs opacity-70 ml-1 border-l pl-2"
          style={{
            color: config.textColor,
            borderColor: config.color
          }}
        >
          {getVerifiedText()}
        </span>
      )}
    </div>
  );
};

// Compact variant for smaller spaces (nav bar, mobile header)
export const TrustIndicatorCompact: React.FC<Omit<TrustIndicatorProps, 'showDetails'>> = (props) => {
  const { status = 'secure' } = props;

  const iconConfig = {
    secure: { icon: Shield, color: 'hsl(var(--indigo-primary))' },
    warning: { icon: AlertTriangle, color: 'hsl(var(--amber-caution))' },
    offline: { icon: RefreshCw, color: 'hsl(var(--slate-500))' }
  };

  const { icon: Icon, color } = iconConfig[status];

  return (
    <div
      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm"
      role="status"
      aria-label={`Security status: ${status}`}
      title={status === 'secure' ? 'Platform Secure' : status === 'warning' ? 'Verifying' : 'Reconnecting'}
    >
      <Icon
        className={cn(
          "w-4 h-4",
          status === 'secure' && "animate-pulse-slow",
          status === 'offline' && "animate-spin"
        )}
        style={{ color }}
        aria-hidden="true"
      />
    </div>
  );
};

// Export for use in other components
export default TrustIndicator;

// Tailwind CSS custom animation (add to tailwind.config.js if not present)
// animate-pulse-slow: {
//   '0%, 100%': { opacity: '1' },
//   '50%': { opacity: '.7' },
// }
