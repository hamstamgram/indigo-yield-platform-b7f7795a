
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare } from "lucide-react";

const Contact = () => {
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
          <MessageSquare className="h-10 w-10 text-indigo-500" />
          <h1 className="text-4xl font-bold text-gray-900">Contact Us</h1>
        </div>
        
        <div className="bg-gray-50 p-8 rounded-xl border border-gray-200">
          <p className="text-lg text-gray-600 mb-6">
            We're here to help with any questions about our yield strategies, investment opportunities, or general inquiries.
          </p>
          
          <div className="mt-8 space-y-6">
            <div className="flex items-center gap-3">
              <Mail className="h-6 w-6 text-indigo-500" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Email</h3>
                <a href="mailto:hello@indigo.fund" className="text-indigo-600 hover:underline">hello@indigo.fund</a>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <MessageSquare className="h-6 w-6 text-indigo-500 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Office Address</h3>
                <address className="not-italic text-gray-600">
                  2121 Biscayne Blvd<br />
                  Miami, FL 33137<br />
                  USA
                </address>
              </div>
            </div>
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
            <Link className="text-gray-500 hover:text-gray-700" to="/terms">Terms</Link>
            <Link className="text-gray-500 hover:text-gray-700" to="/privacy">Privacy</Link>
            <Link className="text-gray-500 hover:text-gray-700" to="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Contact;
