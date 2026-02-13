import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base skeleton component with shimmer animation
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-white/10 via-white/20 to-white/10 bg-[length:200%_100%] rounded",
        className
      )}
    />
  );
};

/**
 * Text skeleton for loading text content
 */
export const TextSkeleton: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className,
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 && "w-3/4" // Last line shorter
          )}
        />
      ))}
    </div>
  );
};

/**
 * Card skeleton for loading card content
 */
export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("bg-card rounded-lg shadow-sm p-6 space-y-4", className)}>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <TextSkeleton lines={3} />
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
};

/**
 * Table skeleton for loading table data
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="border-b border-border pb-2 mb-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4" />
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className={`h-6 ${colIndex === 0 ? "w-full" : "w-4/5"}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Chart skeleton for loading chart data
 */
export const ChartSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn("bg-card rounded-lg shadow-sm p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-6 w-32" />
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>

      <div className="relative h-64">
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between h-full">
          {Array.from({ length: 12 }).map((_, i) => {
            // Use deterministic heights based on index to prevent jittering on re-render
            const heights = [40, 60, 45, 80, 55, 70, 40, 90, 65, 50, 75, 60];
            const heightClass = `h-[${heights[i % heights.length]}%]`;
            return (
              <Skeleton
                key={i}
                className={cn("w-8", heightClass)}
                style={{ height: `${heights[i % heights.length]}%` }}
              />
            );
          })}
        </div>
      </div>

      <div className="flex justify-center mt-4 space-x-4">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
};

/**
 * Dashboard skeleton for loading dashboard layout
 */
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
            <Skeleton className="h-8 w-32 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <ChartSkeleton />

      {/* Table */}
      <div className="bg-card rounded-lg shadow-sm p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <TableSkeleton rows={5} columns={5} />
      </div>
    </div>
  );
};

/**
 * Form skeleton for loading form fields
 */
export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 4 }) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex space-x-3 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
};

/**
 * Profile skeleton for loading user profile
 */
export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="flex items-center space-x-4">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
};

/**
 * List skeleton for loading list items
 */
export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 bg-card rounded-lg">
          <Skeleton className="h-10 w-10 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-6" />
        </div>
      ))}
    </div>
  );
};

export default {
  Skeleton,
  TextSkeleton,
  CardSkeleton,
  TableSkeleton,
  ChartSkeleton,
  DashboardSkeleton,
  FormSkeleton,
  ProfileSkeleton,
  ListSkeleton,
};
