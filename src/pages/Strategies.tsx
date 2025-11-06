import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart3 } from "lucide-react";

const Strategies = () => {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/">
              <img 
                src="/lovable-uploads/74aa0ccc-22f8-4892-9282-3991b5e10f4c.png" 
                alt="Indigo Digital Assets Yield" 
                className="h-8"
              />
            </Link>
          </div>
          <Link to="/">
            <Button variant="outline" className="border-indigo-500 text-indigo-500 hover:bg-indigo-500 hover:text-white">
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="flex items-center space-x-3 mb-8">
          <BarChart3 className="h-10 w-10 text-indigo-500" />
          <h1 className="text-4xl font-bold text-gray-900">Our Strategies</h1>
        </div>
        
        <div className="prose prose-indigo max-w-none">
          <p className="text-lg text-gray-600 mb-6">
            At INDIGO DIGITAL ASSETS YIELD, we employ sophisticated strategies designed to generate sustainable yields across market cycles. Our approach combines traditional financial principles with cutting-edge blockchain opportunities.
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 my-10">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-8 border border-indigo-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Diversified Approach</h2>
              <p className="text-gray-600">
                We allocate capital across multiple yield strategies to minimize concentration risk and optimize for consistent returns through varying market conditions.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-8 border border-indigo-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Risk Management</h2>
              <p className="text-gray-600">
                Every strategy undergoes rigorous risk assessment, with continuous monitoring and predefined risk parameters to protect capital.
              </p>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-6">Core Yield Strategies</h2>
          
          <div className="space-y-8">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-indigo-600 p-4">
                <h3 className="text-xl font-bold text-white">1. Secured Lending</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  Our secured lending strategy provides capital to institutional borrowers, backed by high-quality collateral with conservative loan-to-value ratios.
                </p>
                <h4 className="font-semibold text-gray-900 mb-2">Key Features:</h4>
                <ul className="list-disc pl-5 text-gray-600 space-y-1">
                  <li>Overcollateralized positions (typical LTV: 50-65%)</li>
                  <li>Daily mark-to-market and margin monitoring</li>
                  <li>Rigorous counterparty due diligence</li>
                  <li>Target annual yield: 6-9%</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-indigo-600 p-4">
                <h3 className="text-xl font-bold text-white">2. Liquidity Provision</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  We provide liquidity to leading decentralized exchanges and automated market makers, generating yields from transaction fees while actively managing impermanent loss risk.
                </p>
                <h4 className="font-semibold text-gray-900 mb-2">Key Features:</h4>
                <ul className="list-disc pl-5 text-gray-600 space-y-1">
                  <li>Focus on blue-chip asset pairs and stablecoin pools</li>
                  <li>Active position management to optimize fee generation</li>
                  <li>Sophisticated models to minimize impermanent loss</li>
                  <li>Target annual yield: 8-15%</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-indigo-600 p-4">
                <h3 className="text-xl font-bold text-white">3. Staking & Delegation</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  We participate in securing leading proof-of-stake networks through staking and delegation, generating native token yield while supporting network security.
                </p>
                <h4 className="font-semibold text-gray-900 mb-2">Key Features:</h4>
                <ul className="list-disc pl-5 text-gray-600 space-y-1">
                  <li>Diversification across multiple high-quality networks</li>
                  <li>Technical due diligence on validators</li>
                  <li>Non-custodial staking where possible</li>
                  <li>Target annual yield: 5-12%</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-indigo-600 p-4">
                <h3 className="text-xl font-bold text-white">4. Structured Products</h3>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  We design and deploy structured yield products that combine multiple strategies to create optimized risk-return profiles for specific market conditions.
                </p>
                <h4 className="font-semibold text-gray-900 mb-2">Key Features:</h4>
                <ul className="list-disc pl-5 text-gray-600 space-y-1">
                  <li>Principal protection techniques</li>
                  <li>Strategic options and derivatives usage</li>
                  <li>Yield enhancement through basis trading</li>
                  <li>Target annual yield: 10-18%</li>
                </ul>
              </div>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Portfolio Construction</h2>
          <p className="text-gray-600 mb-6">
            Our yield funds are constructed with careful consideration of strategy correlation, market cycles, and client risk preferences. We allocate capital dynamically in response to changing market conditions while maintaining our core risk management principles.
          </p>
          
          <div className="bg-gray-50 p-8 rounded-xl border border-gray-200 my-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Strategy Allocation Process</h3>
            <ol className="list-decimal pl-5 text-gray-600 space-y-3">
              <li><strong>Opportunity Identification:</strong> Continuous research to identify optimal yield opportunities across the digital asset ecosystem.</li>
              <li><strong>Risk Assessment:</strong> Comprehensive evaluation of counterparty, technical, market, and liquidity risks.</li>
              <li><strong>Due Diligence:</strong> Technical audits, counterparty verification, and security analysis.</li>
              <li><strong>Position Sizing:</strong> Determination of optimal exposure based on risk parameters and return potential.</li>
              <li><strong>Ongoing Monitoring:</strong> 24/7 monitoring of positions with defined risk thresholds and exit strategies.</li>
            </ol>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="container mx-auto px-6 py-12 border-t border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <img 
              src="/lovable-uploads/74aa0ccc-22f8-4892-9282-3991b5e10f4c.png" 
              alt="Indigo Digital Assets Yield" 
              className="h-8"
            />
            <p className="mt-2 text-sm text-gray-500">
              © 2025 INDIGO DIGITAL ASSETS YIELD. All rights reserved.
            </p>
          </div>
          <div className="flex space-x-6">
            <Link className="text-gray-600 hover:text-gray-900" to="/terms">Terms</Link>
            <Link className="text-gray-600 hover:text-gray-900" to="/privacy">Privacy</Link>
            <Link className="text-gray-600 hover:text-gray-900" to="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Strategies;
