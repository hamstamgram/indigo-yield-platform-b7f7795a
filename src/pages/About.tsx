import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navigation */}
      <nav className="container mx-auto px-4 sm:px-6 py-4">
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
            <Button
              variant="outline"
              className="border-indigo-500 text-indigo-500 hover:bg-indigo-500 hover:text-white"
            >
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-4xl">
        <div className="flex items-center space-x-3 mb-6 sm:mb-8">
          <Info className="h-8 w-8 sm:h-10 sm:w-10 text-indigo-500" />
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">About Us</h1>
        </div>

        <div className="prose prose-indigo max-w-none">
          <p className="text-base sm:text-lg text-gray-600 mb-6">
            INDIGO DIGITAL ASSETS YIELD was founded in 2023 by a team of experts with decades of
            combined experience in traditional finance and digital assets.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">
            Our Mission
          </h2>
          <p className="text-gray-600 mb-4">
            Our mission is to provide institutional-grade yield opportunities in the digital asset
            ecosystem through rigorous risk management, diversified strategies, and transparent
            operations.
          </p>

          <div className="bg-gray-50 p-5 sm:p-8 rounded-xl border border-gray-200 my-6 sm:my-8">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Core Values</h3>
            <ul className="space-y-2 sm:space-y-3 text-gray-600">
              <li className="flex items-start">
                <span className="mr-2 text-indigo-500 font-bold">•</span>
                <span>
                  <strong>Security:</strong> We prioritize the protection of client assets above all
                  else.
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-indigo-500 font-bold">•</span>
                <span>
                  <strong>Transparency:</strong> We provide clear insights into our strategies and
                  performance.
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-indigo-500 font-bold">•</span>
                <span>
                  <strong>Excellence:</strong> We strive for exceptional results through rigorous
                  research and execution.
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 text-indigo-500 font-bold">•</span>
                <span>
                  <strong>Innovation:</strong> We continuously explore new opportunities while
                  managing risk.
                </span>
              </li>
            </ul>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">
            Our Team
          </h2>
          <p className="text-gray-600 mb-4 sm:mb-6">
            Our leadership team brings together expertise from traditional finance, blockchain
            technology, and risk management. With backgrounds spanning Wall Street, Silicon Valley,
            and major cryptocurrency exchanges, our team is uniquely positioned to navigate the
            evolving digital asset landscape.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 my-6 sm:my-8">
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                Investment Team
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                Our investment professionals conduct extensive research and due diligence to
                identify optimal yield opportunities while minimizing risk exposure.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                Technical Team
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                Our engineers and security specialists ensure the safety of assets and the
                efficiency of our yield-generating strategies.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                Risk Management
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                Our risk team implements robust frameworks to evaluate and mitigate risks across all
                our operations and investment activities.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                Client Services
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                Our dedicated client service team provides personalized support to meet the specific
                needs of our investors.
              </p>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">
            Our Approach
          </h2>
          <p className="text-gray-600 mb-4">
            We take a disciplined, research-driven approach to generating yield in digital assets.
            By diversifying across multiple strategies and platforms, we aim to deliver consistent
            returns regardless of market conditions.
          </p>

          <div className="my-8 sm:my-10 border-l-4 border-indigo-500 pl-4 sm:pl-6 py-2 bg-indigo-50">
            <p className="italic text-gray-700 text-sm sm:text-base">
              "Our goal is to bridge the gap between traditional finance and the emerging digital
              asset ecosystem, providing institutional-quality infrastructure and risk management."
            </p>
          </div>
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
            />
            <p className="mt-2 text-sm text-gray-500">
              © 2025 INDIGO DIGITAL ASSETS YIELD. All rights reserved.
            </p>
          </div>
          <div className="flex space-x-4 sm:space-x-6">
            <Link className="text-gray-600 hover:text-gray-900" to="/terms">
              Terms
            </Link>
            <Link className="text-gray-600 hover:text-gray-900" to="/privacy">
              Privacy
            </Link>
            <Link className="text-gray-600 hover:text-gray-900" to="/contact">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default About;
