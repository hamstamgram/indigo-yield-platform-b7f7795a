import { Menu } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
  Button,
} from "@/components/ui";
import { useBreadcrumbs } from "@/hooks";
import { Link } from "react-router-dom";
import { useAuth } from "@/services/auth";
import { FundAUMBar } from "@/components/admin";

type HeaderProps = {
  toggleSidebar: () => void;
};

const Header = ({ toggleSidebar }: HeaderProps) => {
  const breadcrumbs = useBreadcrumbs();
  const { isAdmin } = useAuth();

  return (
    <header className="h-16 flex items-center px-4 sm:px-6 lg:px-8 mt-4 lg:mt-6 mb-2 flex-shrink-0 animate-fade-in relative z-20">
      {/* Mobile hamburger menu - Enhanced contrast for visibility */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="lg:hidden mr-4 -ml-2 text-foreground/80 hover:bg-white/50 hover:text-foreground"
        aria-label="Toggle menu"
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Mobile logo */}
      <div className="lg:hidden flex-1 flex justify-center mr-8">
        <img
          src="/lovable-uploads/INDIGO_logo-white.png"
          alt="Indigo Yield Fund"
          className="h-8 w-auto opacity-90"
          loading="lazy"
          decoding="async"
        />
      </div>

      {/* Desktop content */}
      <div className="hidden lg:flex flex-1 items-center justify-between">
        {/* Breadcrumbs - Now transparent and sleek */}
        <div className="ml-2">
          {breadcrumbs.length > 0 && (
            <Breadcrumb>
              <BreadcrumbList className="text-sm font-medium">
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center">
                    {index > 0 && <BreadcrumbSeparator className="text-muted-foreground/40 mx-2" />}
                    <BreadcrumbItem>
                      {crumb.isCurrentPage ? (
                        <BreadcrumbPage className="text-foreground font-semibold flex items-center gap-2">
                          {/* Optional: Add icon based on route here if available */}
                          {crumb.title}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link
                            to={crumb.href!}
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            {crumb.title}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </div>

        {/* Global Action Area - Right Side */}
        <div className="flex items-center gap-4">
          {/* Admin Fund AUM Bar */}
          {isAdmin && (
            <div className="bg-white/50 dark:bg-black/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-black/5 dark:border-white/10 shadow-sm">
              <FundAUMBar />
            </div>
          )}

          {/* Notification Bell or other global actions could go here */}
        </div>
      </div>
    </header>
  );
};

export default Header;
