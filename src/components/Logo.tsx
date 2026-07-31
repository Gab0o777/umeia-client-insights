// Logo — usa el icono oficial, texto de marca según dominio (ver whitelabel.ts)
import { cn } from "@/lib/utils";
import { getBrandName } from "@/lib/whitelabel";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, showText = true, size = "md" }: LogoProps) {
  const brandName = getBrandName();
  const sizes = {
    sm: { box: "h-7 w-7", text: "text-base" },
    md: { box: "h-9 w-9", text: "text-lg" },
    lg: { box: "h-12 w-12", text: "text-2xl" },
  };
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src="/umeia-icon.png"
        alt={brandName}
        className={cn("rounded-xl object-contain", sizes[size].box)}
      />
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-bold tracking-tight", sizes[size].text)}>{brandName}</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Portal Cliente
          </span>
        </div>
      )}
    </div>
  );
}
