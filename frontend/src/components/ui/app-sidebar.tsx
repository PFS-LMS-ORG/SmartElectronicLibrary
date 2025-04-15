// Menu items.
import {
    Home,
    Users,
    Book,
    FileClock,
    UserPlus,
    BookOpenCheck
  } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"


  
  const items = [
    {
      title: "Home",
      url: "/admin",
      icon: Home,
    },
    {
      title: "All Users",
      url: "/admin/users",
      icon: Users, // 👤 Multiple users icon
    },
    {
      title: "All Books",
      url: "/admin/books",
      icon: Book, // 📚 Book icon
    },
    {
      title: "Borrow Requests",
      url: "/admin/requests",
      icon: FileClock, // 🕒 File with clock icon = pending requests
    },
    {
      title: "Rentals",
      url: "/admin/rentals",
      icon : BookOpenCheck, // 🕒 File with clock icon = rentals
    },
    {
      title: "Account Requests",
      url: "#",
      icon: UserPlus, // ➕👤 New user request
    },
  ]
  

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
