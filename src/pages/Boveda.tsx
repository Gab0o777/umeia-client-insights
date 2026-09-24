import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useVaultAccess } from "@/hooks/useVaultAccess";
import { SectionHeader } from "@/components/SectionHeader";
import { KpiSkeleton, EmptyData } from "@/components/Skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldCheck, Lock, Unlock, KeyRound, Plus, Trash2, Pencil, Copy, Eye, EyeOff,
  Loader2, ShieldAlert, Share2, LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { vaultApi } from "@/lib/vaultApi";
import {
  deriveKek, generateSalt, generateKeypair, generateDek, generateRecoverySecret,
  aesGcmEncrypt, aesGcmDecrypt, sealForRecipient, openSealedBox,
  bytesToBase64, base64ToBytes, bytesToUtf8, utf8ToBytes,
} from "@/lib/vaultCrypto";

interface ItemPayload {
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
}

const EMPTY_ITEM: ItemPayload = { title: "", username: "", password: "", url: "", notes: "" };

type Phase = "loading" | "no-access" | "setup" | "locked" | "unlocked";

export default function Boveda() {
  const { tenant, accessToken } = useAuth();
  const { hasAccess, loading: accessLoading } = useVaultAccess();

  const [phase, setPhase] = useState<Phase>("loading");
  const [privateKey, setPrivateKey] = useState<Uint8Array | null>(null);
  const [dek, setDek] = useState<Uint8Array | null>(null);

  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [unlockPassphrase, setUnlockPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);

  const [items, setItems] = useState<Array<{ id: number; data: ItemPayload }>>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [editing, setEditing] = useState<{ id: number | null; data: ItemPayload } | null>(null);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const tenantId = tenant?.apiSlug;

  useEffect(() => {
    if (accessLoading) return;
    if (!hasAccess) { setPhase("no-access"); return; }
    if (!tenantId || !accessToken) return;

    vaultApi.getIdentity(tenantId, accessToken)
      .then((identity) => setPhase(identity.exists ? "locked" : "setup"))
      .catch(() => toast.error("No pudimos cargar tu bóveda. Probá de nuevo."));
  }, [accessLoading, hasAccess, tenantId, accessToken]);

  // ── setup: create a brand new vault identity ──────────────────────────
  const handleSetup = useCallback(async () => {
    if (!tenantId || !accessToken) return;
    if (passphrase.length < 10) { toast.error("Usá al menos 10 caracteres para tu passphrase."); return; }
    if (passphrase !== confirmPassphrase) { toast.error("Las passphrases no coinciden."); return; }

    setBusy(true);
    try {
      const salt = generateSalt();
      const kek = await deriveKek(passphrase, salt);
      const keypair = generateKeypair();
      const wrapped = await aesGcmEncrypt(kek, keypair.privateKey);

      const recovery = generateRecoverySecret();
      const recoverySalt = generateSalt();
      const recoveryKek = await deriveKek(recovery, recoverySalt);
      const wrappedForRecovery = await aesGcmEncrypt(recoveryKek, keypair.privateKey);

      const created = await vaultApi.createIdentity(tenantId, accessToken, {
        salt: bytesToBase64(salt),
        public_key: bytesToBase64(keypair.publicKey),
        wrapped_private_key_ciphertext: bytesToBase64(wrapped.ciphertext),
        wrapped_private_key_iv: bytesToBase64(wrapped.iv),
        recovery_salt: bytesToBase64(recoverySalt),
        recovery_wrapped_private_key_ciphertext: bytesToBase64(wrappedForRecovery.ciphertext),
        recovery_wrapped_private_key_iv: bytesToBase64(wrappedForRecovery.iv),
      });

      // Bootstrap or inherit the tenant DEK.
      const dekWrap = await vaultApi.getDekWrap(tenantId, accessToken);
      let tenantDek: Uint8Array;
      if (!dekWrap.exists && dekWrap.is_first_admin) {
        tenantDek = generateDek();
        const sealed = await sealForRecipient(keypair.publicKey, tenantDek);
        await vaultApi.putDekWrap(tenantId, accessToken, {
          vault_identity_id: created.vault_identity_id,
          ephemeral_public_key: bytesToBase64(sealed.ephemeralPublicKey),
          ciphertext: bytesToBase64(sealed.ciphertext),
          iv: bytesToBase64(sealed.iv),
        });
      } else if (dekWrap.exists) {
        tenantDek = await openSealedBox(keypair.privateKey, {
          ephemeralPublicKey: base64ToBytes(dekWrap.ephemeral_public_key!),
          ciphertext: base64ToBytes(dekWrap.ciphertext!),
          iv: base64ToBytes(dekWrap.iv!),
        });
      } else {
        // Granted but nobody's shared the DEK with us yet.
        setPrivateKey(keypair.privateKey);
        setRecoveryCode(recovery);
        toast.info("Tu bóveda está lista. Pedile a otro admin que la abra para compartirte el acceso.");
        setPhase("locked");
        setBusy(false);
        return;
      }

      setPrivateKey(keypair.privateKey);
      setDek(tenantDek);
      setRecoveryCode(recovery);
      setPhase("unlocked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos crear tu bóveda.");
    } finally {
      setBusy(false);
    }
  }, [tenantId, accessToken, passphrase, confirmPassphrase]);

  // ── unlock: existing identity, just entering the passphrase ───────────
  const handleUnlock = useCallback(async () => {
    if (!tenantId || !accessToken) return;
    setBusy(true);
    try {
      const identity = await vaultApi.getIdentity(tenantId, accessToken);
      if (!identity.exists) throw new Error("No hay identidad de bóveda todavía.");

      const kek = await deriveKek(unlockPassphrase, base64ToBytes(identity.salt!));
      const priv = await aesGcmDecrypt(kek, {
        ciphertext: base64ToBytes(identity.wrapped_private_key_ciphertext!),
        iv: base64ToBytes(identity.wrapped_private_key_iv!),
      });

      const dekWrap = await vaultApi.getDekWrap(tenantId, accessToken);
      if (!dekWrap.exists) {
        setPrivateKey(priv);
        toast.info(
          dekWrap.is_first_admin
            ? "Todavía no generaste la clave de la bóveda."
            : "Ningún admin te compartió el acceso todavía.",
        );
        setBusy(false);
        return;
      }

      const tenantDek = await openSealedBox(priv, {
        ephemeralPublicKey: base64ToBytes(dekWrap.ephemeral_public_key!),
        ciphertext: base64ToBytes(dekWrap.ciphertext!),
        iv: base64ToBytes(dekWrap.iv!),
      });

      setPrivateKey(priv);
      setDek(tenantDek);
      setPhase("unlocked");
      setUnlockPassphrase("");
    } catch {
      toast.error("Passphrase incorrecta.");
    } finally {
      setBusy(false);
    }
  }, [tenantId, accessToken, unlockPassphrase]);

  const handleLock = () => {
    setPrivateKey(null);
    setDek(null);
    setItems([]);
    setRevealed(new Set());
    setPhase("locked");
  };

  // ── items: load + decrypt once unlocked ────────────────────────────────
  const loadItems = useCallback(async () => {
    if (!tenantId || !accessToken || !dek) return;
    const { items: raw } = await vaultApi.listItems(tenantId, accessToken);
    const decrypted = await Promise.all(
      raw.map(async (row) => {
        try {
          const plain = await aesGcmDecrypt(dek, {
            ciphertext: base64ToBytes(row.ciphertext),
            iv: base64ToBytes(row.iv),
          });
          return { id: row.id, data: JSON.parse(bytesToUtf8(plain)) as ItemPayload };
        } catch {
          return { id: row.id, data: { ...EMPTY_ITEM, title: "(no se pudo descifrar)" } };
        }
      }),
    );
    setItems(decrypted);
  }, [tenantId, accessToken, dek]);

  useEffect(() => {
    if (phase !== "unlocked") return;
    loadItems();
    if (tenantId && accessToken) {
      vaultApi.getPendingRecipients(tenantId, accessToken)
        .then((r) => setPendingCount(r.pending.length))
        .catch(() => setPendingCount(0));
    }
  }, [phase, loadItems, tenantId, accessToken]);

  const handleShare = useCallback(async () => {
    if (!tenantId || !accessToken || !dek) return;
    setBusy(true);
    try {
      const { pending } = await vaultApi.getPendingRecipients(tenantId, accessToken);
      for (const recipient of pending) {
        const sealed = await sealForRecipient(base64ToBytes(recipient.public_key), dek);
        await vaultApi.putDekWrap(tenantId, accessToken, {
          vault_identity_id: recipient.vault_identity_id,
          ephemeral_public_key: bytesToBase64(sealed.ephemeralPublicKey),
          ciphertext: bytesToBase64(sealed.ciphertext),
          iv: bytesToBase64(sealed.iv),
        });
      }
      toast.success(`Acceso compartido con ${pending.length} admin(s).`);
      setPendingCount(0);
    } catch {
      toast.error("No pudimos compartir el acceso.");
    } finally {
      setBusy(false);
    }
  }, [tenantId, accessToken, dek]);

  const handleSaveItem = useCallback(async () => {
    if (!tenantId || !accessToken || !dek || !editing) return;
    setBusy(true);
    try {
      const blob = await aesGcmEncrypt(dek, utf8ToBytes(JSON.stringify(editing.data)));
      const body = { ciphertext: bytesToBase64(blob.ciphertext), iv: bytesToBase64(blob.iv) };
      if (editing.id === null) {
        await vaultApi.createItem(tenantId, accessToken, body);
      } else {
        await vaultApi.updateItem(tenantId, accessToken, editing.id, body);
      }
      setEditing(null);
      await loadItems();
      toast.success("Guardado.");
    } catch {
      toast.error("No pudimos guardar el item.");
    } finally {
      setBusy(false);
    }
  }, [tenantId, accessToken, dek, editing, loadItems]);

  const handleDeleteItem = useCallback(async (id: number) => {
    if (!tenantId || !accessToken) return;
    if (!confirm("¿Borrar este acceso guardado?")) return;
    try {
      await vaultApi.deleteItem(tenantId, accessToken, id);
      await loadItems();
    } catch {
      toast.error("No pudimos borrar el item.");
    }
  }, [tenantId, accessToken, loadItems]);

  const copyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value);
    toast.success("Copiado — se borra del portapapeles en 20s.");
    setTimeout(() => { navigator.clipboard.writeText("").catch(() => {}); }, 20_000);
  };

  const toggleReveal = (id: number) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (accessLoading || phase === "loading") return <KpiSkeleton />;

  if (phase === "no-access") {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
        <h2 className="text-lg font-semibold">No tenés acceso a la Bóveda</h2>
        <p className="text-sm text-muted-foreground mt-1">Contactá a tu referente si necesitás guardar accesos acá.</p>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Bóveda"
        description="Guardá accesos y contraseñas cifrados de punta a punta — ni siquiera umeia puede leerlos."
        actions={phase === "unlocked" ? (
          <Button variant="outline" size="sm" onClick={handleLock}>
            <LogOut className="h-4 w-4 mr-2" /> Bloquear
          </Button>
        ) : undefined}
      />

      {phase === "setup" && (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Creá tu bóveda</CardTitle>
            <CardDescription>
              Esta passphrase nunca se manda a nuestros servidores — solo vos podés desbloquear tus accesos con ella.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pp">Passphrase</Label>
              <Input id="pp" type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="pp2">Confirmar passphrase</Label>
              <Input id="pp2" type="password" value={confirmPassphrase} onChange={(e) => setConfirmPassphrase(e.target.value)} />
            </div>
            <Button className="w-full" disabled={busy} onClick={handleSetup}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
              Crear bóveda
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "locked" && (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" /> Bóveda bloqueada</CardTitle>
            <CardDescription>Ingresá tu passphrase para desbloquearla.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Passphrase"
              value={unlockPassphrase}
              onChange={(e) => setUnlockPassphrase(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            />
            <Button className="w-full" disabled={busy} onClick={handleUnlock}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Unlock className="h-4 w-4 mr-2" />}
              Desbloquear
            </Button>
          </CardContent>
        </Card>
      )}

      {phase === "unlocked" && (
        <div className="space-y-4">
          {pendingCount > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="flex items-center justify-between py-4">
                <span className="text-sm">{pendingCount} admin(s) esperando que compartas el acceso.</span>
                <Button size="sm" variant="outline" disabled={busy} onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" /> Compartir
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button size="sm" onClick={() => setEditing({ id: null, data: { ...EMPTY_ITEM } })}>
              <Plus className="h-4 w-4 mr-2" /> Nuevo acceso
            </Button>
          </div>

          {items.length === 0 ? (
            <EmptyData message="Todavía no guardaste ningún acceso." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{item.data.title || "(sin título)"}</CardTitle>
                    {item.data.url && <CardDescription>{item.data.url}</CardDescription>}
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">{item.data.username}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(item.data.username)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono">{revealed.has(item.id) ? item.data.password : "••••••••••"}</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleReveal(item.id)}>
                          {revealed.has(item.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(item.data.password)}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {item.data.notes && <p className="text-muted-foreground text-xs">{item.data.notes}</p>}
                    <div className="flex justify-end gap-1 pt-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing({ id: item.id, data: item.data })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteItem(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <Dialog open={!!recoveryCode} onOpenChange={(open) => !open && setRecoveryCode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardá tu recovery key</DialogTitle>
            <DialogDescription>
              Si olvidás tu passphrase, esta es la ÚNICA forma de recuperar tu bóveda. Umeia no la guarda — copiala y
              guardala en un lugar seguro ahora, no se vuelve a mostrar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-md border bg-muted p-3 font-mono text-sm break-all">
            {recoveryCode}
          </div>
          <DialogFooter>
            <Button onClick={() => { copyToClipboard(recoveryCode ?? ""); }}>
              <Copy className="h-4 w-4 mr-2" /> Copiar
            </Button>
            <Button variant="outline" onClick={() => setRecoveryCode(null)}>Ya la guardé</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id === null ? "Nuevo acceso" : "Editar acceso"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Título</Label>
                <Input value={editing.data.title} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, title: e.target.value } })} />
              </div>
              <div>
                <Label>URL</Label>
                <Input value={editing.data.url} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, url: e.target.value } })} />
              </div>
              <div>
                <Label>Usuario</Label>
                <Input value={editing.data.username} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, username: e.target.value } })} />
              </div>
              <div>
                <Label>Contraseña</Label>
                <Input type="text" value={editing.data.password} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, password: e.target.value } })} />
              </div>
              <div>
                <Label>Notas</Label>
                <Textarea value={editing.data.notes} onChange={(e) => setEditing({ ...editing, data: { ...editing.data, notes: e.target.value } })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button disabled={busy} onClick={handleSaveItem}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
