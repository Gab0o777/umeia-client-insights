import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { vaultApi } from "@/lib/vaultApi";

/** Dispatched after activating the vault module so every mounted
 * useVaultAccess() (e.g. the sidebar) picks up the change immediately
 * instead of only after a full page reload. */
export const VAULT_ACCESS_CHANGED_EVENT = "vault-access-changed";

/** hasAccess: tenant module enabled — gates the Bóveda nav/page for every
 * portal user in the tenant, no per-user grant anymore. */
export function useVaultAccess() {
  const { tenant, accessToken } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    if (!tenant || !accessToken) {
      setHasAccess(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    vaultApi
      .getAccess(tenant.apiSlug, accessToken)
      .then((res) => setHasAccess(res.has_access))
      .catch(() => setHasAccess(false))
      .finally(() => setLoading(false));
  }, [tenant, accessToken]);

  useEffect(() => { refetch(); }, [refetch]);

  useEffect(() => {
    window.addEventListener(VAULT_ACCESS_CHANGED_EVENT, refetch);
    return () => window.removeEventListener(VAULT_ACCESS_CHANGED_EVENT, refetch);
  }, [refetch]);

  return { hasAccess, loading };
}
