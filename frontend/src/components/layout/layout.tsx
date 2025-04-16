import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { useState } from "react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-gray-900">
        <AppSidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
        <div className="flex flex-col flex-1 w-full transition-all duration-300">
          {/* Header */}
          <header className="z-10 py-3 bg-gray-800 shadow-sm border-b border-gray-700 md:px-6 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <SidebarTrigger
                  className="p-1 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                />
                <h2 className="text-xl font-semibold text-white sm:text-lg text-base">
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
    </SidebarProvider>
  );
}