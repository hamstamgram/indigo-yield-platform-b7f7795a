import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

const Contact = () => {
  const isMobile = useIsMobile();
  
  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-4">
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
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-4xl">
        {/* Header Section with Gradient */}
        <div className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 sm:p-8 mb-8 shadow-lg">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">Contact Us</h1>
          <p className="text-base sm:text-lg text-indigo-100 max-w-2xl">
            We're here to help with any questions about our yield strategies or investment opportunities.
          </p>
        </div>
        
        {/* Contact Information Card */}
        <Card className="shadow-lg border-indigo-100 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
            <CardTitle className="text-2xl text-indigo-800 flex items-center gap-2">
              <Mail className="h-6 w-6 text-indigo-500" />
              Get in Touch
            </CardTitle>
          </CardHeader>
          <CardContent className={`p-6 sm:p-8 ${isMobile ? "" : "grid grid-cols-2 gap-8"}`}>
            {/* Email Contact */}
            <div className="flex items-start gap-4 p-5 rounded-lg bg-white border border-gray-100 shadow-sm mb-6 sm:mb-0">
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
            <div className="flex items-start gap-4 p-5 rounded-lg bg-white border border-gray-100 shadow-sm">
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
          </CardContent>
        </Card>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="mb-6 sm:mb-0">
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
        </div>
      </footer>
    </div>
  );
};

export default Contact;
