import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  className?: string;
  tooltipClassName?: string;
}

/**
 * TruncatedText component that shows a tooltip when text exceeds maxLength.
 * Uses CSS truncation by default, with optional character-based truncation.
 */
export function TruncatedText({
  text,
  maxLength,
  className,
  tooltipClassName,
}: TruncatedTextProps) {
  // If maxLength is provided, use character-based truncation
  const shouldTruncate = maxLength ? text.length > maxLength : false;
  const displayText = maxLength && shouldTruncate 
    ? `${text.slice(0, maxLength)}...` 
    : text;

  // For CSS-based truncation (no maxLength), always show tooltip on hover
  const useCssTruncation = !maxLength;

  if (useCssTruncation) {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "block truncate max-w-full cursor-default",
                className
              )}
              title="" // Prevent native tooltip
            >
              {text}
            </span>
          </TooltipTrigger>
          <TooltipContent 
            className={cn("max-w-xs break-words", tooltipClassName)}
            side="top"
          >
            {text}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Character-based truncation with conditional tooltip
  if (!shouldTruncate) {
    return <span className={className}>{text}</span>;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("cursor-default", className)}>{displayText}</span>
        </TooltipTrigger>
        <TooltipContent 
          className={cn("max-w-xs break-words", tooltipClassName)}
          side="top"
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default TruncatedText;
