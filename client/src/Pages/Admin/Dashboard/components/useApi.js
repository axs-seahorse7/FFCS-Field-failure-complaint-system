// components/useApi.js
import { useState, useEffect, useCallback, useRef } from "react";
import api from "../../../../services/axios-interceptore/api.js";

/**
 * Generic data-fetching hook.
 * @param {string} url       - API endpoint
 * @param {object} [params]  - query params (year, customerName, from, to, etc.)
 * @param {boolean} [lazy]   - if true, don't fetch on mount; call refetch() manually
 *
 * Re-fetches automatically whenever `params` values change.
 */
export function useApi(url, params = {}, lazy = false) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(!lazy);
  const [error,   setError]   = useState(null);

  // Serialise params to a stable string so useEffect dependency works correctly
  // (object identity changes every render even if values are the same)
  const paramsKey = JSON.stringify(params);

  const fetch_ = useCallback(async (overrideParams) => {
    setLoading(true);
    setError(null);
    try {
      // Use overrideParams if provided (manual refetch call), otherwise
      // parse from the serialised key so we always have the latest values
      const resolvedParams = overrideParams ?? JSON.parse(paramsKey);

      // Strip empty / undefined values so they don't pollute the query string
      const cleanParams = Object.fromEntries(
        Object.entries(resolvedParams).filter(([, v]) => v !== undefined && v !== null && v !== "")
      );

      const res = await api.get(url, { params: cleanParams });
      setData(res.data?.data ?? res.data ?? []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load data");
      setData([]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, paramsKey]);   // re-creates fetch_ whenever url or any param value changes

  useEffect(() => {
    if (!lazy) fetch_();
  }, [fetch_, lazy]);     // triggers re-fetch whenever fetch_ is recreated (i.e. params changed)

  return { data, loading, error, refetch: fetch_ };
}