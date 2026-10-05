import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useVaultAccess } from "@/hooks/useVaultAccess";
import { SectionHeader } from "@/components/SectionHeader";
import { KpiSkeleton } from "@/components/Skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  ShieldCheck, Lock, Unlock, KeyRound, Plus, Trash2, Pencil, Copy, Eye, EyeOff,
  Loader2, ShieldAlert, LogOut, RefreshCw, User, Link2, Type, Hash, StickyNote, Globe,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { vaultApi } from "@/lib/vaultApi";
import { legacyVaultApi } from "@/lib/legacyVaultApi";
import { bootstrapVault, rotateVaultPassphrase, unlockVault } from "@/lib/vaultSetup";
import { aesGcmDecrypt, aesGcmEncrypt, base64ToBytes, bytesToBase64, bytesToUtf8, utf8ToBytes } from "@/lib/vaultCrypto";
import { VaultLegacyMigration } from "@/components/VaultLegacyMigration";
import {
  ADDABLE_FIELD_TYPES, FIELD_DEFS, newField, newItem, normalizeToV2,
  type FieldType, type ItemPayload, type VaultField,
} from "@/lib/vaultItem";

type Phase = "loading" | "no-access" | "setup" | "legacy-migration" | "locked" | "unlocked";

// An icon per field type — gives each row an at-a-glance identity.
const FIELD_ICON: Record<FieldType, LucideIcon> = {
  username: User,
  password: KeyRound,
  url: Link2,
  text: Type,
  number: Hash,
  note: StickyNote,
};

// Label + hint shown in the "Agregar campo" menu.
const ADD_FIELD_META: Record<FieldType, { hint: string }> = {
  username: { hint: "" },
  password: { hint: "" },
  text: { hint: "Una línea de texto" },
  number: { hint: "PIN, puerto, ID…" },
  note: { hint: "Texto multilínea" },
  url: { hint: "Un enlace" },
};

export default function Boveda() {
  const { tenant, accessToken } = useAuth();
  const { hasAccess, loading: accessLoading } = useVaultAccess();

  const [phase, setPhase] = useState<Phase>("loading");
  const [dek, setDek] = useState<Uint8Array | null>(null);
  const [secretVersion, setSecretVersion] = useState<number | null>(null);

  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [unlockPassphrase, setUnlockPassphrase] = useState("");
  const [busy, setBusy] = useState(false);

  const [rotateOpen, setRotateOpen] = useState(false);
  const [newPassphrase, setNewPassphrase] = useState("");
  const [confirmNewPassphrase, setConfirmNewPassphrase] = useState("");

  const [items, setItems] = useState<Array<{ id: number; data: ItemPayload }>>([]);
  const [editing, setEditing] = useState<{ id: number | null; data: ItemPayload } | null>(null);
  // Keyed by `${itemId}:${fieldId}` for the cards and `edit:${fieldId}` for the dialog.
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const tenantId = tenant?.apiSlug;

  useEffect(() => {
    if (accessLoading) return;
    if (!hasAccess) { setPhase("no-access"); return; }
    if (!tenantId || !accessToken) return;

    vaultApi.getSecret(tenantId, accessToken)
      .then(async (secret) => {
        if (secret.exists) { setPhase("locked"); return; }
        try {
          const legacyIdentity = await legacyVaultApi.getIdentity(tenantId, accessToken);
          setPhase(legacyIdentity.exists ? "legacy-migration" : "setup");
        } catch {
          setPhase("setup");
        }
      })
      .catch(() => toast.error("No pudimos cargar tu bóveda. Probá de nuevo."));
  }, [accessLoading, hasAccess, tenantId, accessToken]);

  // ── setup: bootstrap the tenant's shared passphrase ────────────────────
  const handleSetup = useCallback(async () => {
    if (!tenantId || !accessToken) return;
    if (passphrase.length < 10) { toast.error("Usá al menos 10 caracteres para la passphrase."); return; }
    if (passphrase !== confirmPassphrase) { toast.error("Las passphrases no coinciden."); return; }

    setBusy(true);
    try {
      const result = await bootstrapVault(tenantId, accessToken, passphrase);
      setDek(result.dek);
      setSecretVersion(result.version);
      setPhase("unlocked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos crear la bóveda.");
    } finally {
      setBusy(false);
    }
  }, [tenantId, accessToken, passphrase, confirmPassphrase]);

  // ── unlock: enter the shared passphrase ────────────────────────────────
  const handleUnlock = useCallback(async () => {
    if (!tenantId || !accessToken) return;
    setBusy(true);
    try {
      const result = await unlockVault(tenantId, accessToken, unlockPassphrase);
      setDek(result.dek);
      setSecretVersion(result.version);
      setPhase("unlocked");
      setUnlockPassphrase("");
    } catch {
      toast.error("Passphrase incorrecta.");
    } finally {
      setBusy(false);
    }
  }, [tenantId, accessToken, unlockPassphrase]);

  const handleLock = () => {
    setDek(null);
    setSecretVersion(null);
    setItems([]);
    setRevealed(new Set());
    setPhase("locked");
  };

  const handleLegacyMigrated = useCallback((migratedDek: Uint8Array, version: number) => {
    setDek(migratedDek);
    setSecretVersion(version);
    setPhase("unlocked");
  }, []);

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
          return { id: row.id, data: normalizeToV2(JSON.parse(bytesToUtf8(plain))) };
        } catch {
          return { id: row.id, data: normalizeToV2(null) };
        }
      }),
    );
    setItems(decrypted);
  }, [tenantId, accessToken, dek]);

  useEffect(() => {
    if (phase !== "unlocked") return;
    loadItems();
  }, [phase, loadItems]);

  // ── rotate the shared passphrase ────────────────────────────────────────
  const handleRotate = useCallback(async () => {
    if (!tenantId || !accessToken || !dek || secretVersion === null) return;
    if (newPassphrase.length < 10) { toast.error("Usá al menos 10 caracteres para la nueva passphrase."); return; }
    if (newPassphrase !== confirmNewPassphrase) { toast.error("Las passphrases no coinciden."); return; }

    setBusy(true);
    try {
      const { version } = await rotateVaultPassphrase(tenantId, accessToken, dek, newPassphrase, secretVersion);
      setSecretVersion(version);
      setRotateOpen(false);
      setNewPassphrase("");
      setConfirmNewPassphrase("");
      toast.success("Passphrase cambiada — avisale a los demás cuál es la nueva.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos cambiar la passphrase.");
    } finally {
      setBusy(false);
    }
  }, [tenantId, accessToken, dek, secretVersion, newPassphrase, confirmNewPassphrase]);

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

  const toggleReveal = (key: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // ── edit dialog: field helpers ──────────────────────────────────────────
  const updateField = (id: string, patch: Partial<VaultField>) =>
    setEditing((prev) =>
      prev ? { ...prev, data: { ...prev.data, fields: prev.data.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) } } : prev,
    );

  const removeField = (id: string) =>
    setEditing((prev) =>
      prev ? { ...prev, data: { ...prev.data, fields: prev.data.fields.filter((f) => f.id !== id) } } : prev,
    );

  const addField = (type: FieldType) =>
    setEditing((prev) =>
      prev ? { ...prev, data: { ...prev.data, fields: [...prev.data.fields, newField(type)] } } : prev,
    );

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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setRotateOpen(true)}>
              <RefreshCw className="h-4 w-4 mr-2" /> Cambiar passphrase
            </Button>
            <Button variant="outline" size="sm" onClick={handleLock}>
              <LogOut className="h-4 w-4 mr-2" /> Bloquear
            </Button>
          </div>
        ) : undefined}
      />

      {phase === "legacy-migration" && tenantId && accessToken && (
        <VaultLegacyMigration tenantId={tenantId} accessToken={accessToken} onMigrated={handleLegacyMigrated} />
      )}

      {phase === "setup" && (
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Creá la bóveda del equipo</CardTitle>
            <CardDescription>
              Esta passphrase nunca se manda a nuestros servidores. Es compartida por todo el equipo — cualquiera que
              la conozca puede desbloquear la bóveda directamente, sin pasos adicionales.
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
            <CardDescription>Ingresá la passphrase del equipo para desbloquearla.</CardDescription>
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
          <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 text-accent shrink-0" />
            Todo se cifra en tu navegador antes de salir de tu computadora — ni el equipo de Umeia puede ver tus contraseñas.
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {items.length === 0
                ? "Sin accesos guardados"
                : `${items.length} ${items.length === 1 ? "acceso guardado" : "accesos guardados"}`}
            </p>
            <Button onClick={() => setEditing({ id: null, data: newItem() })}>
              <Plus className="h-4 w-4 mr-2" /> Nuevo acceso
            </Button>
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 py-16 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <KeyRound className="h-7 w-7" />
              </div>
              <h3 className="text-base font-semibold">Todavía no guardaste ningún acceso</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Creá tu primera credencial — elegí los campos que necesites y se cifra en tu navegador.
              </p>
              <Button className="mt-5" onClick={() => setEditing({ id: null, data: newItem() })}>
                <Plus className="h-4 w-4 mr-2" /> Nuevo acceso
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const urlField = item.data.fields.find((f) => f.type === "url");
                const LeadIcon = urlField ? Globe : KeyRound;
                return (
                  <Card
                    key={item.id}
                    className="group flex flex-col border-border/60 transition-all duration-200 hover:border-accent/40 hover:shadow-[var(--shadow-lg)]"
                  >
                    <CardHeader className="flex-row items-start gap-3 space-y-0 pb-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[image:var(--gradient-accent)] text-white shadow-[var(--shadow-glow)]">
                        <LeadIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-base leading-tight">{item.data.title || "(sin título)"}</CardTitle>
                        {urlField?.value && <CardDescription className="truncate">{urlField.value}</CardDescription>}
                      </div>
                      <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditing({ id: item.id, data: item.data })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-1 pb-4">
                      {item.data.fields.length === 0 && <p className="text-xs text-muted-foreground">Sin campos.</p>}
                      {item.data.fields.map((field) => {
                        const def = FIELD_DEFS[field.type];
                        const FieldIcon = FIELD_ICON[field.type];
                        const revealKey = `${item.id}:${field.id}`;
                        const isRevealed = revealed.has(revealKey);
                        if (field.type === "note") {
                          return (
                            <div key={field.id} className="rounded-lg bg-muted/40 px-3 py-2">
                              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                <FieldIcon className="h-3 w-3" /> {field.label}
                              </div>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{field.value || "—"}</p>
                            </div>
                          );
                        }
                        return (
                          <div key={field.id} className="group/field flex items-center gap-3 rounded-lg px-3 py-1.5 transition-colors hover:bg-muted/40">
                            <FieldIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{field.label}</div>
                              <div className={`truncate text-sm ${def.masked ? "font-mono" : ""}`}>
                                {def.masked && !isRevealed && field.value
                                  ? "••••••••••"
                                  : field.value || <span className="text-muted-foreground">—</span>}
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover/field:opacity-100">
                              {def.masked && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => toggleReveal(revealKey)}>
                                  {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={!field.value} onClick={() => copyToClipboard(field.value)}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Dialog open={rotateOpen} onOpenChange={(open) => { if (!open) { setRotateOpen(false); setNewPassphrase(""); setConfirmNewPassphrase(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar la passphrase compartida</DialogTitle>
            <DialogDescription>
              Los accesos guardados no cambian, solo la passphrase para desbloquear la bóveda. Avisale a los demás la
              nueva passphrase por otro canal — sesiones ya desbloqueadas no se cierran, pero para volver a entrar
              van a necesitar la nueva.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="new-pp">Nueva passphrase</Label>
              <Input id="new-pp" type="password" value={newPassphrase} onChange={(e) => setNewPassphrase(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="new-pp2">Confirmar nueva passphrase</Label>
              <Input id="new-pp2" type="password" value={confirmNewPassphrase} onChange={(e) => setConfirmNewPassphrase(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRotateOpen(false)}>Cancelar</Button>
            <Button disabled={busy} onClick={handleRotate}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Cambiar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[image:var(--gradient-accent)] text-white">
                <KeyRound className="h-4 w-4" />
              </span>
              {editing?.id === null ? "Nuevo acceso" : "Editar acceso"}
            </DialogTitle>
            <DialogDescription>
              Armá la credencial con los campos que necesites. Se cifra en tu navegador antes de guardarse.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Título</Label>
                <Input
                  placeholder="Ej: Acceso a Facebook"
                  value={editing.data.title}
                  onChange={(e) => setEditing({ ...editing, data: { ...editing.data, title: e.target.value } })}
                />
              </div>

              <div className="space-y-2">
                {editing.data.fields.map((field) => {
                  const def = FIELD_DEFS[field.type];
                  const FieldIcon = FIELD_ICON[field.type];
                  const revealKey = `edit:${field.id}`;
                  const isRevealed = revealed.has(revealKey);
                  return (
                    <div key={field.id} className="group/row rounded-xl border border-border/60 bg-muted/20 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <FieldIcon className="h-4 w-4 shrink-0 text-accent" />
                        <Input
                          className="h-6 border-0 bg-transparent px-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-none focus-visible:ring-0"
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/row:opacity-100"
                          onClick={() => removeField(field.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {def.input === "textarea" ? (
                        <Textarea className="bg-background" value={field.value} onChange={(e) => updateField(field.id, { value: e.target.value })} />
                      ) : (
                        <div className="flex items-center gap-1">
                          <Input
                            className="bg-background"
                            type={def.masked && !isRevealed ? "password" : def.inputType ?? "text"}
                            value={field.value}
                            onChange={(e) => updateField(field.id, { value: e.target.value })}
                          />
                          {def.masked && (
                            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground" onClick={() => toggleReveal(revealKey)}>
                              {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full border-dashed">
                    <Plus className="h-4 w-4 mr-2" /> Agregar campo
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  {ADDABLE_FIELD_TYPES.map((type) => {
                    const Icon = FIELD_ICON[type];
                    return (
                      <DropdownMenuItem key={type} className="gap-2.5 py-2" onClick={() => addField(type)}>
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="text-sm leading-tight">{FIELD_DEFS[type].label}</span>
                          <span className="text-xs text-muted-foreground">{ADD_FIELD_META[type].hint}</span>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
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
