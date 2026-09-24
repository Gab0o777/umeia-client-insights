import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { vaultApi } from "@/lib/vaultApi";

/** Dispatched after activating the vault module (or granting/revoking
 * access) so every mounted useVaultAccess() (e.g. the sidebar) picks up
 * the change immediately instead of only after a full page reload. */
export const VAULT_ACCESS_CHANGED_EVENT = "vault-access-changed";

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

  const refetch = useCallback(() => {
    if (!tenant || !accessToken) {
      setHasAccess(false);
      setIsVaultAdmin(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    vaultApi
      .getAccess(tenant.apiSlug, accessToken)
      .then((res) => { setHasAccess(res.has_access); setIsVaultAdmin(res.is_vault_admin); })
      .catch(() => { setHasAccess(false); setIsVaultAdmin(false); })
      .finally(() => setLoading(false));
  }, [tenant, accessToken]);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    window.addEventListener(VAULT_ACCESS_CHANGED_EVENT, refetch);
    return () => window.removeEventListener(VAULT_ACCESS_CHANGED_EVENT, refetch);
  }, [refetch]);

  return { hasAccess, isVaultAdmin, loading };
}
