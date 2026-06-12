import { useTheme } from "@/context/ThemeContext";
import { SectionHeader } from "@/components/SectionHeader";
import { Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

function ThemeOption({
  value,
  current,
  icon: Icon,
  label,
  description,
  onClick,
}: {
  value: "dark" | "light";
  current: string;
  icon: typeof Sun;
  label: string;
  description: string;
  onClick: () => void;
}) {
  const active = current === value;
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition-all w-full",
        active
          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
          : "border-border bg-card hover:border-primary/40 hover:bg-secondary/40",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
      </div>
      {active && (
        <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary" />
      )}
    </button>
  );
}

export default function Configuracion() {
  const { theme, toggle } = useTheme();

  return (
    <div className="space-y-8 max-w-2xl">
      <SectionHeader
        title="Configuración"
        description="Personalizá la experiencia del portal."
      />

      {/* Apariencia */}
      <div className="premium-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center">
            <Monitor className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Apariencia</h3>
            <p className="text-xs text-muted-foreground">Elegí el tema visual del portal.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ThemeOption
            value="light"
            current={theme}
            icon={Sun}
            label="Claro"
            description="Fondo blanco, ideal para ambientes iluminados."
            onClick={() => theme !== "light" && toggle()}
          />
          <ThemeOption
            value="dark"
            current={theme}
            icon={Moon}
            label="Oscuro"
            description="Fondo oscuro, ideal para reducir fatiga visual."
            onClick={() => theme !== "dark" && toggle()}
          />
        </div>
      </div>
    </div>
  );
}
