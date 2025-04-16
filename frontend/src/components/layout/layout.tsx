import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/ui/app-sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="w-full flex h-screen overflow-hidden bg-gray-900">
        <AppSidebar />
        <div className="flex flex-col flex-1 w-full">
          {/* Header */}
          <header className="z-10 py-4 bg-gray-800 shadow-sm border-b border-gray-700">
            <div className="flex items-center justify-between px-6">
              <div className="flex items-center space-x-3">
                <SidebarTrigger className="p-1 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <h2 className="text-xl font-semibold text-white">Library Admin</h2>
              </div>
            </div>
          </header>
          
          {/* Main content */}
          <main className="flex-1 overflow-y-auto bg-gray-900">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}