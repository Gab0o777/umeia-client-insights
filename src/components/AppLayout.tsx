import { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/context/AuthContext";
import { Construction, LogOut } from "lucide-react";

interface Props {
  children?: ReactNode;
}

// Vista mostrada cuando el usuario logueado no tiene tenant asignado aún
// (su tenant_id no matchea ningún tenant mock en TENANTS)
function NoTenantView() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center mb-6">
        <Construction className="w-7 h-7 text-accent" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Panel en configuración</h1>
      <p className="text-sm text-muted-foreground max-w-sm mb-1">
        Tu acceso está listo, pero el equipo de UMEIA todavía está
        preparando los datos de tu panel.
      </p>
      <p className="text-xs text-muted-foreground max-w-sm mb-8">
        Te avisaremos cuando esté disponible. Si creés que es un error,
        contactá a tu referente UMEIA.
      </p>
      {user && (
        <p className="text-xs text-muted-foreground/60 mb-4">
          Sesión activa: <span className="font-mono">{user.email}</span>
        </p>
      )}
      <button
        onClick={logout}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg border border-border hover:bg-secondary/50"
      >
        <LogOut className="w-3.5 h-3.5" />
        Cerrar sesión
      </button>
    </div>
  );
}

export function AppLayout({ children }: Props) {
  const { tenant } = useAuth();

  // Si el usuario no tiene tenant asignado, mostrar vista genérica
  if (!tenant) {
    return <NoTenantView />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-x-hidden">
          <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8 animate-fade-in">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
