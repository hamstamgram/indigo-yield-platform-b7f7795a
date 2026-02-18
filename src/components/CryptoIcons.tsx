import React, { useState } from "react";
import { getAssetLogo } from "@/utils/assets";

interface CryptoIconProps {
  symbol: string;
  className?: string;
}

export const CryptoIcon: React.FC<CryptoIconProps> = ({ symbol, className = "h-10 w-10" }) => {
  const [error, setError] = useState(false);
  const safeSymbol = symbol || "???";

  // Use the centralized utility to get the logo URL
  const src = getAssetLogo(safeSymbol);

  if (error || !symbol) {
    return (
      <div
        className={`bg-muted border border-border rounded-full flex items-center justify-center ${className}`}
      >
        <span className="text-muted-foreground font-bold text-xs">
          {safeSymbol.substring(0, 3).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={safeSymbol}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
};
