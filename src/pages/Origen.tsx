import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info))", "hsl(var(--muted-foreground))"];

export default function Origen() {
  const { tenant } = useAuth();
  if (!tenant) return null;

  // Inyectamos "WhatsApp Campaign" como fuente adicional, agregando totales de campañas
  const campaignTotals = tenant.campaigns.reduce(
    (a, c) => ({ volume: a.volume + c.delivered, conversions: a.conversions + c.leads }),
    { volume: 0, conversions: 0 },
  );
  const originRows = [
    ...tenant.origin,
    {
      source: "WhatsApp Campaign",
      campaign: `${tenant.campaigns.length} campañas activas`,
      ad: tenant.type === "cloud" ? "Cloud API directa" : "Integración local",
      landing: "/whatsapp",
      volume: campaignTotals.volume,
      conversions: campaignTotals.conversions,
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="Origen de las consultas" description="De dónde vienen tus interacciones y cuánto convierten." />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold mb-4">Volumen por origen</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={originRows} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="source" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="volume" name="Volumen" radius={[8, 8, 0, 0]}>
                  {originRows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="premium-card p-5">
          <h3 className="text-sm font-semibold mb-4">Conversiones por origen</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={originRows} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="source" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="conversions" name="Conversiones" radius={[8, 8, 0, 0]} fill="hsl(var(--success))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="premium-card p-5">
        <h3 className="text-sm font-semibold mb-4">Detalle por campaña</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Campaña</TableHead>
                <TableHead>Anuncio</TableHead>
                <TableHead>Landing</TableHead>
                <TableHead className="text-right">Volumen</TableHead>
                <TableHead className="text-right">Conv.</TableHead>
                <TableHead className="text-right">CR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {originRows.map((o, i) => {
                const cr = o.volume ? (o.conversions / o.volume) * 100 : 0;
                const isCampaign = o.source === "WhatsApp Campaign";
                return (
                  <TableRow key={i}>
                    <TableCell>
                      {isCampaign ? (
                        <Badge className="bg-info/15 text-info hover:bg-info/20 border-0">📣 {o.source}</Badge>
                      ) : (
                        <Badge variant="outline">{o.source}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{o.campaign}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{o.ad}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{o.landing}</TableCell>
                    <TableCell className="text-right font-medium">{o.volume.toLocaleString("es-AR")}</TableCell>
                    <TableCell className="text-right font-medium text-success">{o.conversions}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{cr.toFixed(1)}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
