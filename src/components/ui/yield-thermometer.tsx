/**
 * YieldThermometer Component
 *
 * Gamified daily yield visualization with progress tracking
 * Part of Indigo Yield Platform Design System v2.0 - "Sophisticated Simplicity"
 *
 * Features:
 * - Visual progress thermometer showing daily yield
 * - Goal-based messaging and motivation
 * - Investment recommendations based on performance
 * - Gradient fill using Mint → Indigo spectrum
 *
 * @example
 * <YieldThermometer
 *   currentYield={45.32}
 *   goalYield={50.00}
 *   currency="USD"
 *   showRecommendations={true}
 * />
 */

import React from 'react';
import { TrendingUp, Target, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface YieldThermometerProps {
  /**
   * Current daily yield amount
   */
  currentYield: number;

  /**
   * Daily yield goal target
   */
  goalYield: number;

  /**
   * Currency symbol (default: USD)
   */
  currency?: string;

  /**
   * Show investment recommendations
   */
  showRecommendations?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const YieldThermometer: React.FC<YieldThermometerProps> = ({
  currentYield,
  goalYield,
  currency = 'USD',
  showRecommendations = true,
  className
}) => {
  // Calculate progress percentage (capped at 100%)
  const progress = Math.min((currentYield / goalYield) * 100, 100);
  const isGoalReached = currentYield >= goalYield;
  const isCloseToGoal = progress >= 80 && progress < 100;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Get motivational message based on progress
  const getMessage = () => {
    if (isGoalReached) {
      return {
        icon: Sparkles,
        text: 'Goal Achieved!',
        subtext: 'Your portfolio is performing excellently today',
        color: 'text-mint-success',
        bgColor: 'bg-mint-surface'
      };
    } else if (isCloseToGoal) {
      return {
        icon: Target,
        text: 'Almost There!',
        subtext: `${formatCurrency(goalYield - currentYield)} away from your daily goal`,
        color: 'text-indigo-primary',
        bgColor: 'bg-indigo-surface'
      };
    } else {
      return {
        icon: TrendingUp,
        text: 'Building Momentum',
        subtext: `${progress.toFixed(0)}% of your daily yield goal`,
        color: 'text-slate-700',
        bgColor: 'bg-slate-100'
      };
    }
  };

  const message = getMessage();
  const MessageIcon = message.icon;

  // Get investment recommendation based on performance
  const getRecommendation = () => {
    if (isGoalReached) {
      return {
        title: 'Maintain Your Strategy',
        description: 'Your current asset allocation is performing well. Consider rebalancing quarterly.'
      };
    } else if (progress < 50) {
      return {
        title: 'Consider Higher-Yield Assets',
        description: 'Explore our AI-recommended funds with 8-12% APY to accelerate your progress.'
      };
    } else {
      return {
        title: 'On Track',
        description: 'Continue your current strategy. Small adjustments may help reach your goal faster.'
      };
    }
  };

  const recommendation = getRecommendation();

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Header with current yield */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Today's Yield</p>
          <p className="text-3xl font-bold text-slate-900 font-jetbrains-mono tabular-nums">
            {formatCurrency(currentYield)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-slate-500">Daily Goal</p>
          <p className="text-xl font-semibold text-slate-700 font-jetbrains-mono tabular-nums">
            {formatCurrency(goalYield)}
          </p>
        </div>
      </div>

      {/* Thermometer Progress Bar */}
      <div className="relative">
        {/* Background track */}
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
          {/* Progress fill with gradient */}
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              isGoalReached
                ? "bg-gradient-to-r from-mint-success to-mint-light"
                : "bg-gradient-to-r from-indigo-primary to-indigo-light"
            )}
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Daily yield progress: ${progress.toFixed(0)}%`}
          />
        </div>

        {/* Percentage label */}
        <div className="absolute -top-6 right-0">
          <span className="text-xs font-bold text-indigo-primary tabular-nums">
            {progress.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Motivational Message */}
      <div
        className={cn(
          "flex items-start gap-3 p-4 rounded-lg transition-all duration-300",
          message.bgColor
        )}
      >
        <MessageIcon
          className={cn("w-5 h-5 mt-0.5 flex-shrink-0", message.color)}
          aria-hidden="true"
        />
        <div className="flex-1">
          <p className={cn("text-sm font-semibold", message.color)}>
            {message.text}
          </p>
          <p className="text-xs text-slate-600 mt-1">
            {message.subtext}
          </p>
        </div>
      </div>

      {/* Investment Recommendations */}
      {showRecommendations && (
        <div className="border-t border-slate-200 pt-4">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">
                {recommendation.title}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {recommendation.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Compact variant for dashboard cards
export const YieldThermometerCompact: React.FC<Omit<YieldThermometerProps, 'showRecommendations'>> = (props) => {
  const { currentYield, goalYield, currency = 'USD', className } = props;
  const progress = Math.min((currentYield / goalYield) * 100, 100);
  const isGoalReached = currentYield >= goalYield;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className={cn("w-full space-y-2", className)}>
      {/* Compact header */}
      <div className="flex items-baseline justify-between">
        <p className="text-lg font-bold text-slate-900 font-jetbrains-mono tabular-nums">
          {formatCurrency(currentYield)}
        </p>
        <p className="text-xs text-slate-500">
          of {formatCurrency(goalYield)}
        </p>
      </div>

      {/* Compact progress bar */}
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isGoalReached
              ? "bg-gradient-to-r from-mint-success to-mint-light"
              : "bg-gradient-to-r from-indigo-primary to-indigo-light"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Compact status */}
      <p className="text-xs text-slate-600 tabular-nums">
        {progress.toFixed(0)}% • {isGoalReached ? '✓ Goal reached' : 'In progress'}
      </p>
    </div>
  );
};

export default YieldThermometer;

// Tailwind CSS custom classes (add to tailwind.config.js if not present)
// Note: Requires the following custom color classes in index.css:
// - .text-mint-success, .bg-mint-success, .bg-mint-surface, .bg-mint-light
// - .text-indigo-primary, .bg-indigo-primary, .bg-indigo-surface, .bg-indigo-light
