import { Menu } from "lucide-react";
import AppLogo from "@/components/AppLogo";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth/context";
import { FundAUMBar } from "@/components/admin/FundAUMBar";
type HeaderProps = {
  toggleSidebar: () => void;
};
const Header = ({ toggleSidebar }: HeaderProps) => {
  const breadcrumbs = useBreadcrumbs();
  const { isAdmin } = useAuth();

  return (
    <header className="bg-background border-b border-border shadow-sm z-10">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        {/* Top row - Menu, Logo, Actions */}
        <div className="flex items-center justify-between mb-2">
          {/* Logo centered in header */}
          <div className="flex-1 flex justify-center lg:justify-start lg:ml-4 lg:hidden">
            <AppLogo linkTo="/dashboard" className="h-8 w-auto" showText={false} />
          </div>

          <div className="flex items-center space-x-2"></div>
        </div>

        {/* Admin Fund AUM Bar - Only visible to admins */}
        {isAdmin && (
          <div className="mb-3">
            <FundAUMBar />
          </div>
        )}

        {/* Breadcrumbs */}
        {breadcrumbs.length > 1 && (
          <div className="hidden sm:block">
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
          </div>
        )}
      </div>
    </header>
  );
};
export default Header;
