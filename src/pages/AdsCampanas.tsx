import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { SectionHeader } from "@/components/SectionHeader";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { useZernioCampaigns, useZernioAds, ZernioCampaign } from "@/hooks/useZernioAds";
import { costPrefix } from "@/hooks/useCosts";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ListSkeleton, EmptyData } from "@/components/Skeleton";

function platformLabel(platform: string): string {
  const known: Record<string, string> = {
    google: "Google Ads", google_ads: "Google Ads", googleads: "Google Ads",
    meta: "Meta Ads", facebook: "Meta Ads",
  };
  return known[platform.toLowerCase()] ?? platform.replace(/_/g, " ");
}

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  const s = status.toUpperCase();
  if (s === "ENABLED" || s === "ACTIVE") return "default";
  if (s === "PAUSED") return "secondary";
  return "destructive";
}

function money(n: number, prefix: string): string {
  return `${prefix}${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function AdsRows({ campaignId, tenantSlug, colSpan, prefix }: { campaignId: string; tenantSlug: string; colSpan: number; prefix: string }) {
  const { ads, loading } = useZernioAds(tenantSlug, campaignId);

  if (loading) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} className="bg-secondary/20 py-4">
          <ListSkeleton rows={2} />
        </TableCell>
      </TableRow>
    );
  }

  if (!ads || ads.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={colSpan} className="bg-secondary/20 text-xs text-muted-foreground py-4">
          Sin anuncios activos en esta campaña.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {ads.map(ad => (
        <TableRow key={ad.platform_ad_id} className="bg-secondary/20 hover:bg-secondary/30">
          <TableCell className="pl-10">
            <div className="text-sm">{ad.ad_name || "(sin nombre)"}</div>
            <div className="text-[11px] text-muted-foreground">{ad.ad_set_name}</div>
          </TableCell>
          <TableCell><Badge variant={statusVariant(ad.status)} className="text-[10px] px-1.5 py-0">{ad.status}</Badge></TableCell>
          <TableCell className="text-muted-foreground text-xs">—</TableCell>
          <TableCell className="text-muted-foreground text-xs">—</TableCell>
          <TableCell>{money(ad.spend, prefix)}</TableCell>
          <TableCell>{ad.impressions.toLocaleString("es-AR")}</TableCell>
          <TableCell>{ad.clicks.toLocaleString("es-AR")}</TableCell>
          <TableCell>{ad.ctr.toFixed(2)}%</TableCell>
          <TableCell>{prefix}{ad.cpc.toFixed(2)}</TableCell>
          <TableCell>{ad.conversions.toLocaleString("es-AR")}</TableCell>
          <TableCell>{prefix}{ad.cost_per_conversion.toFixed(2)}</TableCell>
          <TableCell>{ad.roas.toFixed(2)}x</TableCell>
        </TableRow>
      ))}
    </>
  );
}

function CampaignRow({ campaign, tenantSlug, colSpan, prefix }: { campaign: ZernioCampaign; tenantSlug: string; colSpan: number; prefix: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={() => setOpen(v => !v)}
      >
        <TableCell>
          <div className="flex items-center gap-2 min-w-0">
            {open ? <ChevronDown size={14} className="shrink-0 text-muted-foreground" /> : <ChevronRight size={14} className="shrink-0 text-muted-foreground" />}
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{campaign.name}</div>
              <div className="text-[11px] text-muted-foreground">{platformLabel(campaign.platform)}</div>
            </div>
          </div>
        </TableCell>
        <TableCell><Badge variant={statusVariant(campaign.status)} className="text-[10px] px-1.5 py-0">{campaign.status}</Badge></TableCell>
        <TableCell className="text-xs">{campaign.objective ?? "—"}</TableCell>
        <TableCell className="text-xs">
          {campaign.budget_amount != null
            ? `${money(campaign.budget_amount, prefix)}${campaign.budget_type ? ` (${campaign.budget_type})` : ""}`
            : "—"}
        </TableCell>
        <TableCell className="font-medium">{money(campaign.spend, prefix)}</TableCell>
        <TableCell>{campaign.impressions.toLocaleString("es-AR")}</TableCell>
        <TableCell>{campaign.clicks.toLocaleString("es-AR")}</TableCell>
        <TableCell>{campaign.ctr.toFixed(2)}%</TableCell>
        <TableCell>{prefix}{campaign.cpc.toFixed(2)}</TableCell>
        <TableCell>{campaign.conversions.toLocaleString("es-AR")}</TableCell>
        <TableCell>{prefix}{campaign.cost_per_conversion.toFixed(2)}</TableCell>
        <TableCell className="font-medium">{campaign.roas.toFixed(2)}x</TableCell>
      </TableRow>
      {open && <AdsRows campaignId={campaign.platform_campaign_id} tenantSlug={tenantSlug} colSpan={colSpan} prefix={prefix} />}
    </>
  );
}

const COLUMNS = [
  "Campaña / Anuncio", "Estado", "Objetivo", "Presupuesto", "Gasto",
  "Impresiones", "Clicks", "CTR", "CPC", "Conversiones", "Costo/Conv", "ROAS",
];

export default function AdsCampanas() {
  const { tenant } = useAuth();
  const { campaigns, loading } = useZernioCampaigns(tenant?.apiSlug);

  if (!tenant) return null;
  // Vista habilitada solo para bligraf por ahora — ver AppSidebar.tsx.
  if (tenant.apiSlug !== "bligraf") return null;

  const prefix = costPrefix(tenant.currency);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Publicidad — Campañas"
        description={`Detalle de campañas y anuncios de Google Ads de ${tenant.name}. Click en una fila para ver sus anuncios.`}
      />

      <div className="premium-card p-0 overflow-hidden">
        {loading && <div className="p-5"><ListSkeleton rows={5} /></div>}
        {!loading && (!campaigns || campaigns.length === 0) && (
          <div className="p-5"><EmptyData message="Sin campañas sincronizadas todavía." /></div>
        )}
        {!loading && campaigns && campaigns.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map(c => <TableHead key={c}>{c}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map(c => (
                <CampaignRow
                  key={c.platform_campaign_id}
                  campaign={c}
                  tenantSlug={tenant.apiSlug}
                  colSpan={COLUMNS.length}
                  prefix={prefix}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
