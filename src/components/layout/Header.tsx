import { Menu } from "lucide-react";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage,
  Button,
} from "@/components/ui";
import { useBreadcrumbs } from "@/hooks";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth/context";
import { FundAUMBar } from "@/components/admin";

type HeaderProps = {
  toggleSidebar: () => void;
};

const Header = ({ toggleSidebar }: HeaderProps) => {
  const breadcrumbs = useBreadcrumbs();
  const { isAdmin } = useAuth();

  return (
    <header className="h-16 bg-background border-b border-border flex items-center px-4 sm:px-6 flex-shrink-0">
      {/* Mobile hamburger menu - Enhanced contrast for visibility */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggleSidebar}
        className="lg:hidden mr-3 -ml-1 border-primary/30 bg-primary/5 hover:bg-primary/15 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary active:bg-primary/25 transition-colors"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5 text-primary" />
      </Button>

      {/* Mobile logo */}
      <div className="lg:hidden flex-1 flex justify-center">
        <img
          src="/lovable-uploads/74aa0ccc-22f8-4892-9282-3991b5e10f4c.png"
          alt="Indigo Yield Fund"
          className="h-7 w-auto"
        />
      </div>

      {/* Desktop content */}
      <div className="hidden lg:flex flex-1 items-center justify-between">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 1 ? (
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center">
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {crumb.isCurrentPage ? (
                      <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={crumb.href!}>{crumb.title}</Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        ) : (
          <div /> /* Spacer */
        )}

        {/* Admin Fund AUM Bar */}
        {isAdmin && (
          <div className="ml-4">
            <FundAUMBar />
          </div>
        )}
      </div>

      {/* Mobile placeholder for right side balance */}
      <div className="lg:hidden w-10" />
    </header>
  );
};

export default Header;
