import { useState, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Paperclip, Send, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS = {
  abierto: { label: "Abierto", cls: "bg-info/15 text-info border-info/30" },
  en_proceso: { label: "En proceso", cls: "bg-warning/15 text-warning border-warning/30" },
  resuelto: { label: "Resuelto", cls: "bg-success/15 text-success border-success/30" },
} as const;

const PRIORITY = {
  baja: { label: "Baja", cls: "bg-muted text-muted-foreground" },
  media: { label: "Media", cls: "bg-info/15 text-info" },
  alta: { label: "Alta", cls: "bg-destructive/15 text-destructive" },
} as const;

export default function Tickets() {
  const { tenant } = useAuth();
  const firstId = tenant?.tickets[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState<string>(firstId);
  const [type, setType] = useState("Configuración");
  const [priority, setPriority] = useState<"baja" | "media" | "alta">("media");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  if (!tenant) return null;
  const selected = tenant.tickets.find((t) => t.id === selectedId) ?? tenant.tickets[0];

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    toast.success("Ticket enviado (demo)", { description: "Te responderemos a la brevedad." });
    setMessage("");
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Tickets de soporte"
        description="Consultas, integraciones y reportes con UMEIA."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shadow-glow">
                <Plus className="h-4 w-4 mr-2" /> Nuevo ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Crear nuevo ticket</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1.5 block">Tipo</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Configuración">Configuración</SelectItem>
                        <SelectItem value="Integración">Integración</SelectItem>
                        <SelectItem value="Reporte">Reporte</SelectItem>
                        <SelectItem value="Automatización">Automatización</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Prioridad</Label>
                    <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baja">Baja</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block">Mensaje</Label>
                  <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Contanos qué necesitás..." required />
                </div>
                <div>
                  <Label className="mb-1.5 block">Adjunto</Label>
                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                    <Paperclip className="h-4 w-4" />
                    <Input type="file" className="border-0 p-0 h-auto file:mr-2 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs" />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-gradient-primary">
                  <Send className="h-4 w-4 mr-2" /> Enviar ticket
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        {/* Lista */}
        <div className="space-y-2">
          {tenant.tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={cn(
                "w-full text-left premium-card p-4 transition-all",
                selectedId === t.id && "ring-2 ring-primary border-primary",
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-[11px] text-muted-foreground">{t.id}</span>
                <Badge variant="outline" className={STATUS[t.status].cls}>{STATUS[t.status].label}</Badge>
              </div>
              <div className="text-sm font-semibold leading-snug">{t.subject}</div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{t.type} · {t.date}</span>
                <Badge className={cn("text-[10px] border-0", PRIORITY[t.priority].cls)}>{PRIORITY[t.priority].label}</Badge>
              </div>
            </button>
          ))}
        </div>

        {/* Detalle chat */}
        <div className="premium-card p-5 flex flex-col min-h-[400px]">
          {selected ? (
            <>
              <div className="border-b border-border pb-3 mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[11px] text-muted-foreground">{selected.id}</span>
                  <Badge variant="outline" className={STATUS[selected.status].cls}>{STATUS[selected.status].label}</Badge>
                  <Badge className={cn("border-0", PRIORITY[selected.priority].cls)}>{PRIORITY[selected.priority].label}</Badge>
                </div>
                <h3 className="text-lg font-bold">{selected.subject}</h3>
                <div className="text-xs text-muted-foreground mt-1">{selected.type} · creado {selected.date}</div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto scrollbar-thin pr-1">
                {selected.messages.map((m, i) => (
                  <div key={i} className={cn("flex", m.from === "cliente" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                        m.from === "cliente"
                          ? "bg-gradient-primary text-primary-foreground rounded-br-sm"
                          : "bg-secondary rounded-bl-sm",
                      )}
                    >
                      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70 mb-0.5">
                        {m.from === "cliente" ? "Vos" : "UMEIA"}
                      </div>
                      <div>{m.text}</div>
                      <div className="text-[10px] opacity-60 mt-1 text-right">{m.date}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-border flex gap-2">
                <Input placeholder="Responder al ticket..." disabled />
                <Button disabled variant="secondary"><Send className="h-4 w-4" /></Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Seleccioná un ticket para ver el detalle</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
