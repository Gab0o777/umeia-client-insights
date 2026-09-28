import { useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, PartyPopper, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { API_BASE, authHeaders } from "@/lib/apiClient";
import { VAULT_ACCESS_CHANGED_EVENT } from "@/hooks/useVaultAccess";

interface Props {
  tenantId: string;
  accessToken: string;
  onClose: () => void;
  /** Called once the module is actually toggled on, so the caller can refresh its module list. */
  onActivated: () => void;
}

type Step = "intro" | "success";

async function activateVaultModule(tenantId: string, accessToken: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/metrics/modules/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(accessToken) },
    body: JSON.stringify({ tenant_id: tenantId, module_id: "vault", enabled: true }),
  });
  if (!res.ok) throw new Error("No pudimos activar el módulo.");
}

export function VaultActivationWizard({ tenantId, accessToken, onClose, onActivated }: Props) {
  const [step, setStep] = useState<Step>("intro");
  const [busy, setBusy] = useState(false);

  const handleActivate = async () => {
    setBusy(true);
    try {
      await activateVaultModule(tenantId, accessToken);
      onActivated();
      setStep("success");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos activar la bóveda.");
    } finally {
      setBusy(false);
    }
  };

  const handleFinish = () => {
    window.dispatchEvent(new Event(VAULT_ACCESS_CHANGED_EVENT));
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {step === "intro" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" /> Bóveda de accesos
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Es un lugar para guardar contraseñas y accesos de valor (sistemas, cuentas, lo
                que necesites) cifrados de punta a punta — ni siquiera el equipo de Umeia puede
                leerlos.
              </p>
              <p>
                Se desbloquea con una <strong className="text-foreground">passphrase compartida
                por todo el equipo</strong> — cualquiera con acceso al portal puede entrar
                directamente con esa misma passphrase, sin pasos adicionales.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleActivate} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Activar bóveda
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PartyPopper className="h-5 w-5" /> ¡Bóveda activada!
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Andá a la sección Bóveda para definir la passphrase compartida (si sos el primero en
              entrar) o para ingresarla (si ya la definió alguien más de tu equipo).
            </p>
            <DialogFooter>
              <Button onClick={handleFinish}>Listo</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
