import { useState } from "react";
import { useParams } from "react-router-dom";
import { DollarSign } from "lucide-react";
import { Logo } from "@/components/Logo";
import { getBrandName } from "@/lib/whitelabel";
import { CostConnectWizard } from "@/components/CostConnectWizard";

/**
 * Link autoservicio para que el cliente conecte SU PROPIA cuenta de Meta al
 * módulo de costos, sin necesitar login en el panel completo — pensado para
 * mandárselo directo (WhatsApp/mail) al contacto técnico del cliente. Usa el
 * mismo wizard y el mismo endpoint /api/metrics/costs/connect que ya usa el
 * panel interno (sin auth), solo que expuesto en una ruta pública y acotada.
 */
export default function ConectarCostos() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const [open, setOpen] = useState(true);
  const [done, setDone] = useState(false);
  const brandName = getBrandName();

  if (!tenantSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <p className="text-sm text-muted-foreground">Falta el identificador del negocio en el link.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 gap-6">
      <Logo size="md" />
      <div className="premium-card p-8 max-w-md w-full text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-warning/15 flex items-center justify-center mx-auto">
          <DollarSign className="w-6 h-6 text-warning" />
        </div>
        <h1 className="text-lg font-bold">Conectar costos de WhatsApp</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Conectá tu cuenta de Meta para que {brandName} pueda mostrarte el costo real de tus
          mensajes de WhatsApp, directo desde tu WhatsApp Business Account.
        </p>
        {done && !open ? (
          <p className="text-sm text-success font-medium">Listo — ya podés cerrar esta página.</p>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="w-full rounded-xl bg-warning text-warning-foreground text-sm font-semibold py-2.5 hover:opacity-90 transition-opacity"
          >
            Empezar
          </button>
        )}
      </div>

      {open && (
        <CostConnectWizard
          apiSlug={tenantSlug}
          onClose={() => setOpen(false)}
          onConnected={() => setDone(true)}
        />
      )}
    </div>
  );
}
