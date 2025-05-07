
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import NavSection from "@/components/sidebar/NavSection";
import UserProfile from "@/components/sidebar/UserProfile";
import LogoutButton from "@/components/sidebar/LogoutButton";
import { adminNav, mainNav, accountNav } from "@/config/navigation";

type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isAdmin?: boolean;
};

const Sidebar = ({ sidebarOpen, setSidebarOpen, isAdmin = false }: SidebarProps) => {
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();

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

  // Filter navigation items based on admin status
  const filteredMainNav = isAdmin 
    ? [] // Admins don't need the regular main nav
    : mainNav;

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
          {/* Sidebar Header */}
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
            {/* Admin Navigation - Only shown to admin users */}
            {isAdmin && (
              <NavSection 
                title="Admin" 
                items={adminNav} 
                onItemClick={() => setSidebarOpen(false)}
              />
            )}
            
            {/* Main Navigation - Only for non-admin users */}
            {filteredMainNav.length > 0 && (
              <NavSection 
                title="Dashboard" 
                items={filteredMainNav} 
                onItemClick={() => setSidebarOpen(false)}
              />
            )}
            
            {/* Account Navigation */}
            <div>
              <h2 className="px-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Account
              </h2>
              <ul className="space-y-1">
                {accountNav.map((item) => (
                  <li key={item.href}>
                    <button
                      onClick={() => {
                        setSidebarOpen(false);
                        navigate(item.href);
                      }}
                      className={`flex w-full items-center px-2 py-2 text-sm rounded-md group text-gray-700 hover:text-indigo-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-indigo-300 dark:hover:bg-gray-700`}
                    >
                      <span className="mr-3">{item.icon}</span>
                      {item.title}
                    </button>
                  </li>
                ))}
                
                <li>
                  <LogoutButton onLogout={() => setSidebarOpen(false)} />
                </li>
              </ul>
            </div>
          </nav>

          {/* User Profile */}
          <UserProfile userName={userName} isAdmin={isAdmin} />
        </div>
      </div>
    </>
  );
};

export default Sidebar;
