
import { Menu, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

type HeaderProps = {
  toggleSidebar: () => void;
};

const Header = ({ toggleSidebar }: HeaderProps) => {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
      <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center">
        {/* Menu button */}
        <button
          onClick={toggleSidebar}
          className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 p-2 rounded-full bg-indigo-50 dark:bg-indigo-900/20 shadow-sm border border-indigo-100 dark:border-indigo-800 flex items-center justify-center"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        
        <div className="flex-1 flex justify-center">
          {/* This empty div creates space for centered content in AdminDashboard */}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Market Data
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
