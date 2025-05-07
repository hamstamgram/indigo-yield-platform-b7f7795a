
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navigation */}
      <nav className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/">
              <img 
                src="/lovable-uploads/74aa0ccc-22f8-4892-9282-3991b5e10f4c.png" 
                alt="Infinite Yield Fund" 
                className="h-8 sm:h-10"
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
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-4xl">
        <div className="flex items-center space-x-3 mb-6 sm:mb-8">
          <Shield className="h-8 w-8 sm:h-10 sm:w-10 text-indigo-500" />
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Privacy Policy</h1>
        </div>
        
        <div className="prose prose-indigo max-w-none">
          <p className="text-base sm:text-lg text-gray-600 mb-6">
            Last Updated: May 6, 2025
          </p>
          
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">1. Introduction</h2>
          <p className="text-gray-600 mb-4">
            At INDIGO DIGITAL ASSETS YIELD, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
          </p>
          
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">2. Information We Collect</h2>
          <p className="text-gray-600 mb-4">
            <strong>Personal Information:</strong> Name, email address, phone number, and other information you provide when creating an account or contacting us.<br /><br />
            <strong>Financial Information:</strong> Investment amounts, transaction history, and account balances necessary to provide our services.<br /><br />
            <strong>Usage Data:</strong> Information about how you access and use our website, including your IP address, browser type, and device information.
          </p>
          
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">3. How We Use Your Information</h2>
          <p className="text-gray-600 mb-4">
            We use the information we collect to:<br />
            - Provide, maintain, and improve our services<br />
            - Process transactions and manage your account<br />
            - Communicate with you about your account and our services<br />
            - Respond to your inquiries and provide customer support<br />
            - Comply with legal obligations and prevent fraudulent activity
          </p>
          
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">4. Information Sharing</h2>
          <p className="text-gray-600 mb-4">
            We may share your information with:<br />
            - Service providers who assist us in operating our business<br />
            - Financial institutions and partners necessary to complete transactions<br />
            - Legal authorities when required by law or to protect our rights<br />
            - Business partners, with your consent, for marketing purposes
          </p>
          
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">5. Data Security</h2>
          <p className="text-gray-600 mb-4">
            We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.
          </p>
          
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">6. Your Rights</h2>
          <p className="text-gray-600 mb-4">
            Depending on your location, you may have rights to:<br />
            - Access the personal information we hold about you<br />
            - Correct inaccurate or incomplete information<br />
            - Request deletion of your personal information<br />
            - Restrict or object to certain processing activities<br />
            - Receive your data in a portable format
          </p>
          
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">7. Changes to This Privacy Policy</h2>
          <p className="text-gray-600 mb-4">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
          </p>
          
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">8. Contact Us</h2>
          <p className="text-gray-600 mb-4">
            If you have any questions about this Privacy Policy, please contact us through our Contact page.
          </p>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 border-t border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <img 
              src="/lovable-uploads/74aa0ccc-22f8-4892-9282-3991b5e10f4c.png" 
              alt="Infinite Yield Fund" 
              className="h-8"
            />
            <p className="mt-2 text-sm text-gray-500">
              © 2025 INDIGO DIGITAL ASSETS YIELD. All rights reserved.
            </p>
          </div>
          <div className="flex space-x-4 sm:space-x-6">
            <Link className="text-gray-500 hover:text-gray-700" to="/terms">Terms</Link>
            <Link className="text-gray-500 hover:text-gray-700" to="/privacy">Privacy</Link>
            <Link className="text-gray-500 hover:text-gray-700" to="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Privacy;
