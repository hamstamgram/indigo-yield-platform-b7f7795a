import React, { useState } from "react";

interface CryptoIconProps {
  symbol: string;
  className?: string;
}

export const CryptoIcon: React.FC<CryptoIconProps> = ({ symbol, className = "h-10 w-10" }) => {
  const [error, setError] = useState(false);
  const lowerSymbol = symbol.toLowerCase();

  // Determine image source
  let src = `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/${lowerSymbol}.svg`;

  // Special cases
  if (lowerSymbol === "eurc" || lowerSymbol === "euroc") {
    src = "https://cryptologos.cc/logos/euro-coin-eurc-logo.svg?v=035";
  } else if (lowerSymbol === "sol") {
    src = "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/sol.svg";
  } else if (lowerSymbol === "usd" || lowerSymbol === "usdt") {
    src = "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/usdt.svg";
  } else if (lowerSymbol === "xaut") {
    src = "https://assets.coingecko.com/coins/images/10481/large/Tether_Gold.png";
  } else if (lowerSymbol === "xrp") {
    src = "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/svg/color/xrp.svg";
  }

  if (error) {
    return (
      <div
        className={`bg-gray-100 border border-gray-200 rounded-full flex items-center justify-center ${className}`}
      >
        <span className="text-gray-500 font-bold text-xs">
          {symbol.substring(0, 3).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={symbol}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
};
