import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  
  return (
    <div className="min-h-screen w-full bg-white font-sans">
      {/* Navigation */}
      <nav className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img
              src="/lovable-uploads/74aa0ccc-22f8-4892-9282-3991b5e10f4c.png"
              alt="Infinite Yield Fund"
              className="h-8"
              width="120"
              height="32"
              loading="eager"
            />
          </div>
          <div className="hidden md:flex items-center space-x-4 lg:space-x-8">
            <Link to="/about" className="text-gray-700 hover:text-gray-900 transition-colors duration-300">About</Link>
            <Link to="/strategies" className="text-gray-700 hover:text-gray-900 transition-colors duration-300">Strategies</Link>
            <Link to="/faq" className="text-gray-700 hover:text-gray-900 transition-colors duration-300">FAQ</Link>
            <Link to="/contact" className="text-gray-700 hover:text-gray-900 transition-colors duration-300">Contact</Link>
          </div>
          <div className="hidden md:block">
            <Link to="/login">
              <Button variant="outline" className="border-indigo-500 text-indigo-500 hover:bg-indigo-500 hover:text-white">
                Investor Login
              </Button>
            </Link>
          </div>
          <div className="md:hidden">
            {/* Mobile menu button */}
            <button
              className="text-gray-700 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Open navigation menu"
              aria-expanded="false"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-16 md:py-20 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-4 sm:mb-6">
          Institutional-Grade <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-500 to-blue-500">
            Yield Opportunities
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 mb-8 sm:mb-10 max-w-2xl mx-auto px-4">
          Unlock sustainable yields in the digital asset ecosystem through our diversified strategies, sophisticated risk management, and institutional infrastructure.
        </p>
        <div className="flex justify-center">
          <Link to="/login">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-base sm:text-lg py-2 sm:py-3 px-6 sm:px-8">
              Investor Access
            </Button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="grid md:grid-cols-3 gap-6 sm:gap-8 lg:gap-10">
          <div className="bg-gray-50 p-6 sm:p-8 rounded-xl border border-gray-200">
            <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 sm:mb-3">Institutional Security</h3>
            <p className="text-gray-600 text-sm sm:text-base">
              Enterprise-grade security with multi-signature wallets, cold storage solutions, and comprehensive insurance coverage.
            </p>
          </div>

          <div className="bg-gray-50 p-6 sm:p-8 rounded-xl border border-gray-200">
            <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 sm:mb-3">Yield Optimization</h3>
            <p className="text-gray-600 text-sm sm:text-base">
              Sophisticated strategies across lending, liquidity provision, and staking to maintain consistent yields regardless of market conditions.
            </p>
          </div>

          <div className="bg-gray-50 p-6 sm:p-8 rounded-xl border border-gray-200">
            <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 sm:mb-3">Risk Management</h3>
            <p className="text-gray-600 text-sm sm:text-base">
              Advanced risk modeling, diversification across protocols, and continuous monitoring to protect capital and generate sustainable returns.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 sm:p-10 md:p-16 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-6">
            Ready to optimize your digital asset portfolio?
          </h2>
          <p className="text-lg sm:text-xl text-indigo-100 mb-6 sm:mb-10 max-w-2xl mx-auto">
            Our invitation-only access ensures we maintain high standards of service for all our investors.
          </p>
          <Link to="/login">
            <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100 text-base sm:text-lg py-2 px-6">
              Access Portal
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 border-t border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <img
              src="/lovable-uploads/74aa0ccc-22f8-4892-9282-3991b5e10f4c.png"
              alt="Indigo Digital Assets Yield"
              className="h-8"
              width="120"
              height="32"
              loading="lazy"
            />
            <p className="mt-2 text-sm text-gray-500">
              © 2025 INDIGO DIGITAL ASSETS YIELD. All rights reserved.
            </p>
          </div>
          <div className="flex space-x-4 sm:space-x-6">
            <Link className="text-gray-600 hover:text-gray-900" to="/terms">Terms</Link>
            <Link className="text-gray-600 hover:text-gray-900" to="/privacy">Privacy</Link>
            <Link className="text-gray-600 hover:text-gray-900" to="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
