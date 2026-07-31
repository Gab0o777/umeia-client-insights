import { useState, FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { getBrandName } from "@/lib/whitelabel";

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = (location.state as { from?: Location })?.from?.pathname ?? "/";
  const brandName = getBrandName();

  const [email,   setEmail]   = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) {
      toast.success(`Bienvenido al Portal ${brandName}`);
      navigate(from, { replace: true });   // vuelve a la ruta donde estaba
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-gradient-glow" />
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between p-6">
        <Logo size="md" />
        <ThemeToggle />
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-88px)] w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-2">
        {/* Hero */}
        <section className="hidden lg:block animate-fade-in-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">Portal de clientes · multi-tenant</span>
          </div>
          <h1 className="mt-6 text-5xl font-bold leading-[1.05] tracking-tight">
            Visualizá toda tu operación con{" "}
            <span className="gradient-text">{brandName}</span>.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            Mensajes, automatización, costos, módulos e infraestructura — en un panel
            premium pensado para mostrar valor a tus clientes en segundos.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            {[
              { k: "24/7", v: "Operación continua" },
              { k: "Bot",  v: "Respuestas automáticas" },
              { k: "CRM",  v: "Integración Kommo" },
            ].map((s) => (
              <div key={s.v} className="premium-card p-4">
                <div className="text-2xl font-bold gradient-text">{s.k}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.v}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Login card */}
        <section className="animate-scale-in">
          <div className="premium-card p-8 sm:p-10 max-w-md mx-auto w-full">
            <h2 className="text-2xl font-bold tracking-tight">Iniciar sesión</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Accedé a tu panel exclusivo de visualización.
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <a
                  href="mailto:soporte@umeia.io?subject=Olvidé mi contraseña del portal"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-primary hover:opacity-90 transition-opacity shadow-glow"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ingresar"}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              ¿Problemas para acceder?{" "}
              <a
                href="mailto:soporte@umeia.io"
                className="text-primary hover:underline font-medium"
              >
                Contactá a tu referente {brandName}
              </a>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
