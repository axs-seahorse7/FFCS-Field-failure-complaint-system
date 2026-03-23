// components/useApi.js
import { useState, useEffect, useCallback, useRef } from "react";
import api from "../../../../services/axios-interceptore/api.js";

/**
 * Generic data-fetching hook.
 * @param {string} url - API endpoint
 * @param {object} [params] - query params
 * @param {boolean} [lazy] - if true, don't fetch on mount; call refetch() manually
 */
export function useApi(url, params = {}, lazy = false) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(!lazy);
  const [error, setError]     = useState(null);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const fetch_ = useCallback(async (overrideParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url, { params: overrideParams ?? paramsRef.current });
      setData(res.data?.data ?? res.data ?? []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load data");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (!lazy) fetch_();
  }, [fetch_, lazy]);

  return { data, loading, error, refetch: fetch_ };
}
