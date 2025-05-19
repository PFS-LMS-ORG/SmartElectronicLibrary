import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react"; // Make sure to import the icons

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <SidebarProvider>
      <LayoutContent 
        isSidebarCollapsed={isSidebarCollapsed} 
        setIsSidebarCollapsed={setIsSidebarCollapsed}
      >
        {children}
      </LayoutContent>
    </SidebarProvider>
  );
}

function LayoutContent({ 
  children, 
  isSidebarCollapsed, 
  setIsSidebarCollapsed 
}: { 
  children: React.ReactNode; 
  isSidebarCollapsed: boolean; 
  setIsSidebarCollapsed: (collapsed: boolean) => void;
}) {
    const sidebar = useSidebar();
    const isOpen = sidebar.open;
    const setIsOpen = sidebar.setOpen;

  // Toggle sidebar collapsed state for desktop
  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Toggle sidebar open state for mobile
  const toggleSidebarOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-900">
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden animate-fadeIn"
          onClick={() => setIsOpen(false)}
        />
      )}

      <AppSidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
      
      <div className="flex flex-col flex-1 w-full transition-all duration-300">
        {/* Header */}
        <header className="z-10 py-3 bg-gray-800 shadow-sm border-b border-gray-700 md:px-6 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* For mobile: toggle sidebar open/close with animated button */}
              <button
                className="p-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 md:hidden transition-colors duration-200"
                onClick={toggleSidebarOpen}
                aria-label="Toggle mobile menu"
              >
                <Menu className="h-5 w-5 text-gray-200" />
              </button>
              
              {/* For desktop: toggle sidebar collapse */}
              <button
                className="p-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 hidden md:flex items-center justify-center transition-colors duration-200"
                onClick={toggleSidebarCollapsed}
                aria-label="Toggle sidebar collapse"
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="h-5 w-5 text-gray-200" />
                ) : (
                  <ChevronLeft className="h-5 w-5 text-gray-200" />
                )}
              </button>
              
              <h2 className="font-semibold text-white sm:text-lg text-base">
                Library Admin
              </h2>
            </div>
          </div>
        </header>
        
        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-900 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}