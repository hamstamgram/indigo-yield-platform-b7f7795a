
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";

const FAQ = () => {
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
          <HelpCircle className="h-10 w-10 text-indigo-500" />
          <h1 className="text-4xl font-bold text-gray-900">Frequently Asked Questions</h1>
        </div>
        
        <div className="prose prose-indigo max-w-none">
          <p className="text-lg text-gray-600 mb-8">
            Find answers to common questions about our yield strategies, investment process, and operational framework.
          </p>
          
          <div className="space-y-8">
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">What is INDIGO DIGITAL ASSETS YIELD?</h3>
              <p className="text-gray-600">
                INDIGO DIGITAL ASSETS YIELD is an institutional-grade digital asset yield platform that generates sustainable returns through diversified strategies across lending, liquidity provision, staking, and structured products. We combine traditional financial principles with blockchain opportunities to deliver consistent yields regardless of market conditions.
              </p>
            </div>
            
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Who can invest with INDIGO?</h3>
              <p className="text-gray-600">
                Our services are available to qualified investors, including high-net-worth individuals, family offices, and institutional investors. Due to regulatory requirements, we have minimum investment thresholds and investor qualification criteria that vary by jurisdiction.
              </p>
            </div>
            
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">What are the minimum investment amounts?</h3>
              <p className="text-gray-600">
                Our minimum investment threshold is typically $100,000 for individuals and $1,000,000 for institutional investors. We may adjust these requirements based on specific investor circumstances and regulatory considerations.
              </p>
            </div>
            
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">How do you manage risk?</h3>
              <p className="text-gray-600">
                Risk management is at the core of our approach. We implement multiple layers of protection, including:
              </p>
              <ul className="list-disc pl-5 text-gray-600 mt-3">
                <li>Diversification across strategies, assets, and platforms</li>
                <li>Rigorous counterparty due diligence</li>
                <li>Technical security audits</li>
                <li>Conservative position sizing</li>
                <li>24/7 monitoring and predefined risk thresholds</li>
                <li>Multi-signature and cold storage security protocols</li>
                <li>Comprehensive insurance coverage</li>
              </ul>
            </div>
            
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">What returns can I expect?</h3>
              <p className="text-gray-600">
                Target returns vary by strategy and risk profile, typically ranging from 6% to 18% annually. Historical performance is available to qualified investors upon request. It's important to note that past performance is not indicative of future results, and all investments carry risk.
              </p>
            </div>
            
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">How is my investment secured?</h3>
              <p className="text-gray-600">
                We employ enterprise-grade security measures, including:
              </p>
              <ul className="list-disc pl-5 text-gray-600 mt-3">
                <li>Multi-signature wallet infrastructure</li>
                <li>Hardware security modules</li>
                <li>Cold storage for the majority of assets</li>
                <li>Regular security audits by third-party specialists</li>
                <li>Insurance coverage for digital assets</li>
                <li>Segregated client accounts</li>
              </ul>
            </div>
            
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">What is the lockup period?</h3>
              <p className="text-gray-600">
                Our standard investment vehicles have lockup periods ranging from 3 to 12 months, depending on the specific strategy and fund structure. We also offer select liquid strategies with shorter redemption windows for investors requiring greater flexibility.
              </p>
            </div>
            
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">How frequently are returns distributed?</h3>
              <p className="text-gray-600">
                Depending on the investment vehicle, returns may be distributed monthly or quarterly, or compounded within the fund. Investors can choose between income-generating options with regular distributions or growth-focused strategies with reinvested returns.
              </p>
            </div>
            
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">What fees do you charge?</h3>
              <p className="text-gray-600">
                Our fee structure typically includes a management fee (1-2% annually) and a performance fee (15-20% of profits above a hurdle rate). Specific fee arrangements are detailed in the investment documentation for each fund or managed account.
              </p>
            </div>
            
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">How can I monitor my investment?</h3>
              <p className="text-gray-600">
                Investors receive detailed monthly performance reports and have access to our investor portal for real-time monitoring. We also provide quarterly investor calls and regular strategy updates. Our client services team is available to address specific inquiries.
              </p>
            </div>
            
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">How do I start investing with INDIGO?</h3>
              <p className="text-gray-600">
                The investment process begins with an initial consultation to understand your objectives and determine suitability. Following this, we provide detailed information on available strategies and assist with the onboarding process, including KYC/AML procedures and investment documentation. Contact us through our website to schedule an initial consultation.
              </p>
            </div>
          </div>
          
          <div className="mt-10 bg-indigo-50 p-6 rounded-xl border border-indigo-100">
            <h3 className="text-xl font-bold text-gray-900 mb-3">Still have questions?</h3>
            <p className="text-gray-600 mb-4">
              Our team is available to address any additional questions you may have about our strategies, investment process, or how to get started.
            </p>
            <Link to="/contact">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                Contact Us
              </Button>
            </Link>
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

export default FAQ;
