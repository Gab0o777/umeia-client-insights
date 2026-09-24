import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { vaultApi } from "@/lib/vaultApi";

/**
 * hasAccess: grant AND tenant module both on — gates the Bóveda nav/page.
 * isVaultAdmin: grant alone, independent of the module — a vault-admin
 * needs this to be true BEFORE the module is active, to see/use the
 * toggle switch in Módulos that turns it on in the first place.
 */
export function useVaultAccess() {
  const { tenant, accessToken } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [isVaultAdmin, setIsVaultAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant || !accessToken) {
      setHasAccess(false);
      setIsVaultAdmin(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    vaultApi
      .getAccess(tenant.apiSlug, accessToken)
      .then((res) => {
        if (cancelled) return;
        setHasAccess(res.has_access);
        setIsVaultAdmin(res.is_vault_admin);
      })
      .catch(() => { if (!cancelled) { setHasAccess(false); setIsVaultAdmin(false); } })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [tenant, accessToken]);

  return { hasAccess, isVaultAdmin, loading };
}
