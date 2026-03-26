// hooks/useApiQuery.js
import { useQuery } from "@tanstack/react-query";
import api from "../../../../services/axios-interceptore/api.js";

export const useApiQuery = (url, params = {}, options = {}) => {
  return useQuery({
    queryKey: [url, params],

    queryFn: async () => {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(
          ([, v]) => v !== undefined && v !== null && v !== ""
        )
      );

      const res = await api.get(url, { params: cleanParams });
      return res.data?.data ?? res.data ?? [];
    },

    // 🔥 default optimizations
    staleTime: 1000 * 60 * 5, // 5 min cache
    keepPreviousData: true,

    // allow override
    ...options,
  });
};