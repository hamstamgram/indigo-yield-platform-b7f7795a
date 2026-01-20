import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";
import { cn } from "@/lib/utils";

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  maxWidth?: string;
  className?: string;
  tooltipClassName?: string;
  as?: "span" | "div" | "p";
}

/**
 * TruncatedText component that shows a tooltip when text exceeds maxLength or is visually truncated.
 * Supports both character-based and CSS-based truncation.
 */
export function TruncatedText({
  text,
  maxLength,
  maxWidth = "100%",
  className,
  tooltipClassName,
  as: Component = "span",
}: TruncatedTextProps) {
  const textRef = React.useRef<HTMLElement>(null);
  const [isOverflowing, setIsOverflowing] = React.useState(false);

  // Check if text is visually overflowing
  React.useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current) {
        setIsOverflowing(textRef.current.scrollWidth > textRef.current.clientWidth);
      }
    };

    checkOverflow();
    // Recheck on window resize
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [text]);

  // If maxLength is provided, use character-based truncation
  const shouldTruncateByLength = maxLength ? text.length > maxLength : false;
  const displayText = maxLength && shouldTruncateByLength ? `${text.slice(0, maxLength)}...` : text;

  // Show tooltip if truncated by length OR visually overflowing
  const showTooltip = shouldTruncateByLength || isOverflowing;

  if (!showTooltip) {
    return (
      <Component
        ref={textRef as any}
        className={cn("block truncate", className)}
        style={{ maxWidth }}
      >
        {text}
      </Component>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Component
          ref={textRef as any}
          className={cn("block truncate cursor-default", className)}
          style={{ maxWidth }}
          title="" // Prevent native tooltip
        >
          {displayText}
        </Component>
      </TooltipTrigger>
      <TooltipContent
        className={cn(
          "max-w-xs break-words bg-popover text-popover-foreground border border-border shadow-lg z-50",
          tooltipClassName
        )}
        side="top"
        sideOffset={4}
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export default TruncatedText;
