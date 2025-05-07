
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Contact = () => {
  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4">
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
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We're here to help with any questions about our yield strategies or investment opportunities.
          </p>
        </div>
        
        <Card className="shadow-lg border-indigo-100 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
            <CardTitle className="text-2xl text-indigo-800 flex items-center gap-2">
              <Mail className="h-6 w-6 text-indigo-500" />
              Get in Touch
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Email Contact */}
              <div className="flex items-start gap-4 p-6 rounded-lg bg-white border border-gray-100 shadow-sm">
                <div className="bg-indigo-100 p-3 rounded-full">
                  <Mail className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Email</h3>
                  <a 
                    href="mailto:hello@indigo.fund" 
                    className="text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                  >
                    hello@indigo.fund
                  </a>
                </div>
              </div>
              
              {/* Office Address */}
              <div className="flex items-start gap-4 p-6 rounded-lg bg-white border border-gray-100 shadow-sm">
                <div className="bg-indigo-100 p-3 rounded-full">
                  <MapPin className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Office Address</h3>
                  <address className="not-italic text-gray-600 leading-relaxed">
                    2121 Biscayne Blvd<br />
                    Miami, FL 33137<br />
                    USA
                  </address>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="container mx-auto px-6 py-12">
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
        </div>
      </footer>
    </div>
  );
};

export default Contact;
