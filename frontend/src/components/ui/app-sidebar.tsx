import {
  Home,
  Users,
  Book,
  FileClock,
  UserPlus,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { useSidebar } from "./sidebar";

// Define menu items
const menuItems = [
  { title: "Home", url: "/admin", icon: Home },
  { title: "All Users", url: "/admin/users", icon: Users },
  { title: "All Books", url: "/admin/books", icon: Book },
  { title: "Borrow Requests", url: "/admin/requests", icon: FileClock },
  { title: "Rentals", url: "/admin/rentals", icon: BookOpenCheck },
  { title: "Account Requests", url: "/admin/account-requests", icon: UserPlus },
];

export function AppSidebar({ isCollapsed, setIsCollapsed }: { isCollapsed: boolean; setIsCollapsed: (collapsed: boolean) => void }) {
  const { user } = useAuth();
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  
  // Get sidebar context to detect if sidebar should be shown on mobile
  const sidebar = useSidebar();
  const isOpen = sidebar.open;

  const getUserInitials = () => {
    if (!user?.name) return "U";
    return user.name.split(' ').map((n: string) => n[0]).join('');
  };

  return (
    <div
      className={`
        h-screen flex-shrink-0 bg-[#1a1e2e] border-r border-[#2a2f42] 
        fixed md:static z-40
        transition-all duration-300 ease-in-out
        ${isCollapsed ? "w-16" : "w-64"}
        md:block md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Logo and Header */}
      <div className="flex items-center p-4 border-b border-[#2a2f42] justify-between">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded bg-indigo-900/50 flex items-center justify-center mr-3">
            <Book className="h-5 w-5 text-indigo-400" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="font-bold text-lg text-gray-200">Library</h1>
              <p className="text-xs text-gray-500">Admin Portal</p>
            </div>
          )}
        </div>
        {/* <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md hover:bg-gray-700 text-gray-400 hover:text-gray-200 md:block hidden"
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button> */}
      </div>
      
      {/* Navigation Section */}
      <div className="px-3 py-5">
        <h2 className="text-xs font-medium text-gray-500 px-3 mb-3">
          {isCollapsed ? "Menu" : "Application"}
        </h2>
        
        {/* Menu Items */}
        <nav>
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive = 
                currentPath === item.url || 
                (item.url !== '/admin' && currentPath.startsWith(item.url));
                
              return (
                <li key={item.title}>
                  <Link
                    to={item.url}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-md text-sm
                      ${isActive 
                        ? 'bg-indigo-900/40 text-indigo-400 border-l-2 border-indigo-500 pl-2' 
                        : 'text-gray-400 hover:bg-[#252a3d] hover:text-gray-300 transition-colors'
                      }
                      ${isCollapsed ? 'justify-center' : ''}
                    `}
                  >
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && <span className="truncate">{item.title}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      
      {/* Footer */}
      <div className="absolute bottom-0 w-full p-4 border-t border-[#2a2f42]">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-indigo-900/40 flex items-center justify-center text-indigo-400 mr-2">
            <span className="text-sm font-medium">{getUserInitials()}</span>
          </div>
          {!isCollapsed && (
            <div>
              <p className="text-sm text-gray-300">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500">{user?.role === 'admin' ? 'Administrator' : 'User'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}