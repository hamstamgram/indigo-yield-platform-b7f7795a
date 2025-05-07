
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NavItem } from "@/types/navigation";

type NavSectionProps = {
  title: string;
  items: NavItem[];
  onItemClick?: () => void;
};

const NavSection: React.FC<NavSectionProps> = ({ title, items, onItemClick }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigation = (href: string) => {
    if (onItemClick) {
      onItemClick();
    }
    navigate(href);
  };

  const isActive = (href: string) => {
    // Direct path match
    if (location.pathname === href) {
      return true;
    }
    
    // Check for tab parameter matches in admin routes
    if (href.includes('admin?tab=') && location.pathname === '/admin') {
      const tabParam = href.split('tab=')[1];
      return location.search.includes(`tab=${tabParam}`);
    }
    
    // Special case for admin pages
    if (href === '/admin-investors') {
      return location.pathname === '/admin-investors';
    }
    
    if (href === '/admin-dashboard') {
      return location.pathname === '/admin-dashboard';
    }
    
    return false;
  };

  return (
    <div className="mb-8">
      <h2 className="px-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {title}
      </h2>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.href}>
            <button
              onClick={() => handleNavigation(item.href)}
              className={`flex w-full items-center px-2 py-2 text-sm rounded-md group ${
                isActive(item.href)
                  ? "text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-900/20"
                  : "text-gray-700 hover:text-indigo-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-indigo-300 dark:hover:bg-gray-700"
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NavSection;
