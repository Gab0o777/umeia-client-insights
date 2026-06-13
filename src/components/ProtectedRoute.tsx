import { Navigate, useLocation } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  // Mientras se restaura la sesión desde localStorage, no redirigimos —
  // evita el flash de login en cada recarga de página.
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
