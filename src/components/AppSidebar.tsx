import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Activity,
  MessagesSquare,
  Boxes,
  Settings,
  LifeBuoy,
  FileCheck2,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { API_BASE, authHeaders } from "@/lib/apiClient";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

// moduleId: gate this item behind /api/metrics/modules — only tenants whose
// config actually has the module active see the link (e.g. "Documentos" only
// applies to tenants with a collect_files node, like Gremio; showing it to
// every tenant would just be an always-empty page for the rest).
const NAV = [
  { to: "/", label: "Resumen", icon: LayoutDashboard, end: true },
  { to: "/actividad", label: "Actividad", icon: Activity },
  { to: "/conversaciones", label: "Conversaciones", icon: MessagesSquare },
  { to: "/documentos", label: "Documentos", icon: FileCheck2, moduleId: "documentos" },
  { to: "/modulos", label: "Módulos", icon: Boxes },
  { to: "/configuracion", label: "Configuración", icon: Settings },
];

const TICKETS_NAV = { to: "/tickets", label: "Tickets", icon: LifeBuoy };

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { tenant, user, logout, accessToken } = useAuth();
  const location = useLocation();
  const [activeModules, setActiveModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!tenant) return;
    fetch(`${API_BASE}/api/metrics/modules?tenant_id=${encodeURIComponent(tenant.apiSlug)}`, {
      headers: authHeaders(accessToken),
    })
      .then((res) => res.json())
      .then((data) => {
        const active = (data.modules ?? [])
          .filter((m: { active: boolean }) => m.active)
          .map((m: { id: string }) => m.id);
        setActiveModules(new Set(active));
      })
      .catch(() => setActiveModules(new Set()));
  }, [tenant, accessToken]);

  const visibleNav = NAV.filter((item) => !item.moduleId || activeModules.has(item.moduleId));

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="px-3 py-3">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between gap-2")}>
          {collapsed ? (
            <SidebarTrigger className="h-8 w-8" />
          ) : (
            <>
              <Logo size="md" />
              <SidebarTrigger className="h-8 w-8 shrink-0" />
            </>
          )}
        </div>
      </SidebarHeader>

      {!collapsed && tenant && (
        <div className="mx-3 mb-3 rounded-xl border border-border bg-gradient-surface p-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "pulse-dot",
                tenant.type === "cloud" ? "bg-info" : "bg-accent",
              )}
            />
            <span
              className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                tenant.type === "cloud" ? "text-info" : "text-accent",
              )}
            >
              {tenant.type === "cloud" ? "Cloud" : "On-Premise"}
            </span>
          </div>
          <div className="mt-2 text-sm font-semibold leading-tight">{tenant.name}</div>
          <div className="text-[11px] text-muted-foreground">{tenant.verticalLabel}</div>
        </div>
      )}

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Navegación</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNav.map((item) => {
                const isActive = item.end
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink to={item.to} end={item.end}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.label}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && (
          <SidebarMenu className="mb-2">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location.pathname.startsWith(TICKETS_NAV.to)}
              >
                <NavLink to={TICKETS_NAV.to}>
                  <TICKETS_NAV.icon className="h-4 w-4" />
                  <span>{TICKETS_NAV.label}</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        {collapsed && (
          <SidebarMenu className="mb-2">
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={location.pathname.startsWith(TICKETS_NAV.to)}
              >
                <NavLink to={TICKETS_NAV.to}>
                  <TICKETS_NAV.icon className="h-4 w-4" />
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        {!collapsed && (
          <div className="h-px bg-border mb-2" />
        )}
        {!collapsed && user && (
          <div className="flex items-center gap-1 px-2 py-1">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{user.displayName}</div>
              <div className="text-[11px] text-muted-foreground truncate">{user.email}</div>
            </div>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
        {collapsed && user && (
          <div className="flex justify-center px-2 py-1">
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
