
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, User, Settings, Home, DollarSign, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CryptoIcon } from "@/components/CryptoIcons";

type NavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
};

const mainNav: NavItem[] = [
  { title: "Overview", href: "/dashboard", icon: <Home className="h-5 w-5" /> },
  { title: "Bitcoin", href: "/assets/btc", icon: <CryptoIcon symbol="btc" className="h-5 w-5" /> },
  { title: "Ethereum", href: "/assets/eth", icon: <CryptoIcon symbol="eth" className="h-5 w-5" /> },
  { title: "Solana", href: "/assets/sol", icon: <CryptoIcon symbol="sol" className="h-5 w-5" /> },
  { title: "USDC", href: "/assets/usdc", icon: <CryptoIcon symbol="usdc" className="h-5 w-5" /> },
];

const secondaryNav: NavItem[] = [
  { title: "Account", href: "/account", icon: <User className="h-5 w-5" /> },
  { title: "Settings", href: "/settings", icon: <Settings className="h-5 w-5" /> },
];

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const [userName, setUserName] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Get profile data
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserName(`${profile.first_name || ''} ${profile.last_name || ''}`);
        } else {
          setUserName(user.email?.split('@')[0] || 'User');
        }
      } else {
        navigate('/login');
      }
    };
    
    getUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
      navigate('/');
    } catch (error) {
      toast({
        title: "Log out failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header - removed the logo and text */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1"></div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <span className="sr-only">Close sidebar</span>
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="mb-8">
              <h2 className="px-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Dashboard
              </h2>
              <ul className="space-y-1">
                {mainNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={`flex items-center px-2 py-2 text-sm rounded-md group ${
                        location.pathname === item.href
                          ? "text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-900/20"
                          : "text-gray-700 hover:text-indigo-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-indigo-300 dark:hover:bg-gray-700"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h2 className="px-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Account
              </h2>
              <ul className="space-y-1">
                {secondaryNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      className={`flex items-center px-2 py-2 text-sm rounded-md group ${
                        location.pathname === item.href
                          ? "text-indigo-700 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-900/20"
                          : "text-gray-700 hover:text-indigo-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-indigo-300 dark:hover:bg-gray-700"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.title}
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    onClick={() => {
                      setSidebarOpen(false);
                      handleLogout();
                    }}
                    className="flex w-full items-center px-2 py-2 text-sm text-gray-700 hover:text-red-600 hover:bg-gray-100 rounded-md group dark:text-gray-300 dark:hover:text-red-400 dark:hover:bg-gray-700"
                  >
                    <span className="mr-3">
                      <LogOut className="h-5 w-5" />
                    </span>
                    Log Out
                  </button>
                </li>
              </ul>
            </div>
          </nav>

          {/* User */}
          <div className="flex items-center px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{userName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Investor</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
