import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { vaultApi } from "@/lib/vaultApi";

/** Whether the current portal user is allowed to see/use the Bóveda section at all. */
export function useVaultAccess() {
  const { tenant, accessToken } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant || !accessToken) {
      setHasAccess(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    vaultApi
      .getAccess(tenant.apiSlug, accessToken)
      .then((res) => { if (!cancelled) setHasAccess(res.has_access); })
      .catch(() => { if (!cancelled) setHasAccess(false); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [tenant, accessToken]);

  return { hasAccess, loading };
}
