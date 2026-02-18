import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import { FileText } from "lucide-react";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Navigation */}
      <nav className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/">
              <img
                src="/lovable-uploads/INDIGO_logo-white.png"
                alt="Infinite Yield Fund"
                className="h-8 sm:h-10"
                loading="lazy"
                decoding="async"
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
          <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-indigo-500" />
          <h1 className="text-3xl sm:text-4xl font-bold">Terms of Service</h1>
        </div>

        <div className="prose prose-indigo max-w-none">
          <p className="text-base sm:text-lg text-muted-foreground mb-6">
            Last Updated: May 6, 2025
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mt-6 sm:mt-8 mb-3 sm:mb-4">
            1. Introduction
          </h2>
          <p className="text-muted-foreground mb-4">
            Welcome to INDIGO DIGITAL ASSETS YIELD. These Terms of Service govern your use of our
            website and services. By accessing or using our services, you agree to be bound by these
            Terms.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mt-6 sm:mt-8 mb-3 sm:mb-4">
            2. Definitions
          </h2>
          <p className="text-muted-foreground mb-4">
            "Platform" refers to the website and services operated by INDIGO DIGITAL ASSETS YIELD.
            <br />
            "User," "you," and "your" refer to the individual or entity using our Platform.
            <br />
            "Services" refers to the financial services, yield optimization strategies, and related
            offerings provided through our Platform.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mt-6 sm:mt-8 mb-3 sm:mb-4">
            3. Eligibility
          </h2>
          <p className="text-muted-foreground mb-4">
            You must be at least 18 years of age and legally able to enter into contracts to use our
            Services. By using our Platform, you represent and warrant that you meet all eligibility
            requirements.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mt-6 sm:mt-8 mb-3 sm:mb-4">
            4. Account Registration
          </h2>
          <p className="text-muted-foreground mb-4">
            To access certain features of our Platform, you may need to register for an account. You
            agree to provide accurate information and keep your account details secure.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mt-6 sm:mt-8 mb-3 sm:mb-4">
            5. Risk Disclosure
          </h2>
          <p className="text-muted-foreground mb-4">
            Digital asset investments involve significant risk. Past performance is not indicative
            of future results. You should carefully consider your investment objectives and risk
            tolerance before participating in any investment activity.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mt-6 sm:mt-8 mb-3 sm:mb-4">
            6. Limitation of Liability
          </h2>
          <p className="text-muted-foreground mb-4">
            To the maximum extent permitted by law, INDIGO DIGITAL ASSETS YIELD shall not be liable
            for any indirect, incidental, special, consequential, or punitive damages resulting from
            your use of or inability to use the Platform or Services.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mt-6 sm:mt-8 mb-3 sm:mb-4">
            7. Governing Law
          </h2>
          <p className="text-muted-foreground mb-4">
            These Terms shall be governed by and construed in accordance with the laws of the
            jurisdiction in which INDIGO DIGITAL ASSETS YIELD is established, without regard to its
            conflict of law principles.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mt-6 sm:mt-8 mb-3 sm:mb-4">
            8. Changes to Terms
          </h2>
          <p className="text-muted-foreground mb-4">
            We reserve the right to modify these Terms at any time. We will provide notice of any
            material changes as required by applicable law.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mt-6 sm:mt-8 mb-3 sm:mb-4">
            9. Contact Information
          </h2>
          <p className="text-muted-foreground mb-4">
            If you have any questions about these Terms, please contact us through our Contact page.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 border-t border-border">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <img
              src="/lovable-uploads/INDIGO_logo-white.png"
              alt="Infinite Yield Fund"
              className="h-8"
              loading="lazy"
              decoding="async"
            />
            <p className="mt-2 text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} INDIGO DIGITAL ASSETS YIELD. All rights reserved.
            </p>
          </div>
          <div className="flex space-x-4 sm:space-x-6">
            <Link className="text-muted-foreground hover:text-foreground" to="/terms">
              Terms
            </Link>
            <Link className="text-muted-foreground hover:text-foreground" to="/privacy">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Terms;
