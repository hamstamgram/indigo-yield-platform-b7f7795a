import React from "react";

interface CryptoIconProps {
  symbol: string;
  className?: string;
}

export const CryptoIcon: React.FC<CryptoIconProps> = ({ symbol, className = "h-10 w-10" }) => {
  const lowerSymbol = symbol.toLowerCase();
  
  if (lowerSymbol === "btc") {
    return (
      <img 
        src="/lovable-uploads/fca55247-2fe5-4db1-a35b-635a50f38a38.png" 
        alt="Bitcoin" 
        className={className} 
      />
    );
  } else if (lowerSymbol === "eth") {
    return (
      <img 
        src="/lovable-uploads/9dc1fa25-5f4c-40b9-ba69-02292e9e5a35.png" 
        alt="Ethereum" 
        className={className} 
      />
    );
  } else if (lowerSymbol === "sol") {
    return (
      <img 
        src="/lovable-uploads/64405caf-9066-45ee-95d1-a980b8de8800.png" 
        alt="Solana" 
        className={className} 
      />
    );
  } else if (lowerSymbol === "usdc") {
    // For USDC we'll keep a colored circle since no icon was provided
    return (
      <div className={`bg-blue-500 rounded-full flex items-center justify-center ${className}`}>
        <span className="text-white font-bold text-xs">USDC</span>
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
