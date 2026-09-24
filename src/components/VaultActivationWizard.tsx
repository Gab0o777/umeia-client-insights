import { useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, KeyRound, Loader2, PartyPopper, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { API_BASE, authHeaders } from "@/lib/apiClient";
import { setupVaultIdentity } from "@/lib/vaultSetup";
import { VAULT_ACCESS_CHANGED_EVENT } from "@/hooks/useVaultAccess";

interface Props {
  tenantId: string;
  accessToken: string;
  onClose: () => void;
  /** Called once the module is actually toggled on, so the caller can refresh its module list. */
  onActivated: () => void;
}

type Step = "intro" | "passphrase" | "success";

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
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    if (passphrase.length < 10) { toast.error("Usá al menos 10 caracteres para tu passphrase."); return; }
    if (passphrase !== confirmPassphrase) { toast.error("Las passphrases no coinciden."); return; }

    setBusy(true);
    try {
      await activateVaultModule(tenantId, accessToken);
      onActivated();
      const result = await setupVaultIdentity(tenantId, accessToken, passphrase);
      setRecoveryCode(result.recoveryCode);
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

  const copyRecovery = () => {
    if (!recoveryCode) return;
    navigator.clipboard.writeText(recoveryCode);
    toast.success("Copiado.");
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
                Para abrirla vas a definir una <strong className="text-foreground">passphrase</strong>.
                No tiene que ser una contraseña complicada: puede ser cualquier frase o cosa que
                sepas que siempre vas a recordar.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={() => setStep("passphrase")}>Siguiente</Button>
            </DialogFooter>
          </>
        )}

        {step === "passphrase" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" /> Definí tu passphrase
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="wiz-pp">Passphrase</Label>
                <Input id="wiz-pp" type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="wiz-pp2">Confirmar passphrase</Label>
                <Input id="wiz-pp2" type="password" value={confirmPassphrase} onChange={(e) => setConfirmPassphrase(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("intro")} disabled={busy}>Atrás</Button>
              <Button onClick={handleCreate} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Crear bóveda
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
              Guardá esta recovery key ahora — es la única forma de recuperar tu bóveda si olvidás
              la passphrase. Umeia no la guarda.
            </p>
            <div className="flex items-center gap-2 rounded-md border bg-muted p-3 font-mono text-sm break-all">
              {recoveryCode}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={copyRecovery}>
                <Copy className="h-4 w-4 mr-2" /> Copiar
              </Button>
              <Button onClick={handleFinish}>Listo</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
