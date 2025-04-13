import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/ui/app-sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex flex-col min-h-screen w-screen bg-gray-100 p-4">
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  )
}
