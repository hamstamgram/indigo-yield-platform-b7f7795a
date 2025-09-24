
import React from "react";

interface CryptoIconProps {
  symbol: string;
  className?: string;
}

export const CryptoIcon: React.FC<CryptoIconProps> = ({ symbol, className = "h-10 w-10" }) => {
  // Convert symbol to lowercase for consistent handling
  const lowerSymbol = symbol.toLowerCase();
  
  // Return the appropriate icon based on symbol
  if (lowerSymbol === "btc") {
    return (
      <img 
        src="/lovable-uploads/7513c47e-3bab-4695-844b-517e1351d56a.png" 
        alt="Bitcoin" 
        className={className} 
      />
    );
  } else if (lowerSymbol === "eth") {
    return (
      <img 
        src="/lovable-uploads/9b4e0bcd-3f9f-4aa8-9172-c5531da8a97e.png" 
        alt="Ethereum" 
        className={className} 
      />
    );
  } else if (lowerSymbol === "sol") {
    return (
      <img 
        src="/lovable-uploads/cdf1010c-56ba-4f71-8689-367a1e21ec4a.png" 
        alt="Solana" 
        className={className} 
      />
    );
  } else if (lowerSymbol === "usdc") {
    return (
      <img 
        src="/lovable-uploads/42eba5df-69d9-4f96-8adf-49db2e0d438b.png" 
        alt="USDC" 
        className={className} 
      />
    );
  } else if (lowerSymbol === "usdt") {
    return (
      <div className={`bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center ${className}`}>
        <span className="text-white font-bold text-xs">₮</span>
      </div>
    );
  } else if (lowerSymbol === "eurc") {
    return (
      <div className={`bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center ${className}`}>
        <span className="text-white font-bold text-xs">€</span>
      </div>
    );
  }
  
  // Fallback for other assets
  return (
    <div className={`bg-gray-300 rounded-full flex items-center justify-center ${className}`}>
      <span className="text-gray-700 font-bold text-xs">{symbol.toUpperCase()}</span>
    </div>
  );
};
