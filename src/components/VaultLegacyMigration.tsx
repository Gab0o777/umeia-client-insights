/**
 * src/components/VaultLegacyMigration.tsx
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * TEMPORARY — Phase A migration window only. Shown instead of the normal
 * setup/locked screens when a tenant already bootstrapped its vault under
 * the old per-user-identity scheme (legacy VaultIdentity/VaultDekWrap rows
 * exist) but hasn't migrated to the new shared-passphrase VaultTenantSecret
 * yet. Asks for the caller's OLD personal passphrase once, recovers the
 * tenant DEK from the legacy sealed box, and re-bootstraps it under a new
 * shared passphrase that every tenant member will use from then on.
 *
 * Deleted in Phase B along with legacyVaultApi.ts, legacyVaultCrypto.ts, and
 * the legacy read-only backend endpoints — see umeiacore migrations.
 */
import { useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { legacyVaultApi } from "@/lib/legacyVaultApi";
import { openSealedBox } from "@/lib/legacyVaultCrypto";
import { aesGcmDecrypt, base64ToBytes, deriveKek } from "@/lib/vaultCrypto";
import { migrateVaultToSharedPassphrase } from "@/lib/vaultSetup";

interface Props {
  tenantId: string;
  accessToken: string;
  onMigrated: (dek: Uint8Array, version: number) => void;
}

export function VaultLegacyMigration({ tenantId, accessToken, onMigrated }: Props) {
  const [oldPassphrase, setOldPassphrase] = useState("");
  const [newPassphrase, setNewPassphrase] = useState("");
  const [confirmNewPassphrase, setConfirmNewPassphrase] = useState("");
  const [busy, setBusy] = useState(false);

  const handleMigrate = useCallback(async () => {
    if (newPassphrase.length < 10) { toast.error("Usá al menos 10 caracteres para la nueva passphrase."); return; }
    if (newPassphrase !== confirmNewPassphrase) { toast.error("Las passphrases no coinciden."); return; }

    setBusy(true);
    try {
      const identity = await legacyVaultApi.getIdentity(tenantId, accessToken);
      if (!identity.exists) throw new Error("No se encontró tu identidad anterior de bóveda.");

      const kek = await deriveKek(oldPassphrase, base64ToBytes(identity.salt!));
      const privateKey = await aesGcmDecrypt(kek, {
        ciphertext: base64ToBytes(identity.wrapped_private_key_ciphertext!),
        iv: base64ToBytes(identity.wrapped_private_key_iv!),
      });

      const dekWrap = await legacyVaultApi.getDekWrap(tenantId, accessToken);
      if (!dekWrap.exists) {
        throw new Error("Todavía no tenés la bóveda compartida con vos — pedile a otro admin que la desbloquee primero.");
      }

      const dek = await openSealedBox(privateKey, {
        ephemeralPublicKey: base64ToBytes(dekWrap.ephemeral_public_key!),
        iv: base64ToBytes(dekWrap.iv!),
        ciphertext: base64ToBytes(dekWrap.ciphertext!),
      });

      const { version } = await migrateVaultToSharedPassphrase(tenantId, accessToken, newPassphrase, dek);
      toast.success("Bóveda migrada — a partir de ahora todos en el equipo usan la misma passphrase.");
      onMigrated(dek, version);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Passphrase anterior incorrecta.");
    } finally {
      setBusy(false);
    }
  }, [tenantId, accessToken, oldPassphrase, newPassphrase, confirmNewPassphrase, onMigrated]);

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> Migrá tu bóveda</CardTitle>
        <CardDescription>
          Ahora la bóveda usa una única passphrase compartida por todo el equipo, en vez de accesos individuales.
          Ingresá tu passphrase personal anterior una última vez para migrar los accesos ya guardados, y definí la
          nueva passphrase compartida.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="old-pp">Tu passphrase personal anterior</Label>
          <Input id="old-pp" type="password" value={oldPassphrase} onChange={(e) => setOldPassphrase(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="new-pp">Nueva passphrase compartida</Label>
          <Input id="new-pp" type="password" value={newPassphrase} onChange={(e) => setNewPassphrase(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="new-pp2">Confirmar nueva passphrase</Label>
          <Input id="new-pp2" type="password" value={confirmNewPassphrase} onChange={(e) => setConfirmNewPassphrase(e.target.value)} />
        </div>
        <Button className="w-full" disabled={busy} onClick={handleMigrate}>
          {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Migrar bóveda
        </Button>
      </CardContent>
    </Card>
  );
}
