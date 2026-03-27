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


export const useBatchQuery = (queries = [], options = {}) => {
  return useQuery({
    queryKey: ["batch", ...queries.map(q => [q.url, q.params])],

    queryFn: async () => {
      const results = await Promise.all(
        queries.map(async ({key, url, params = {} }) => {
          const cleanParams = Object.fromEntries(
            Object.entries(params).filter(
              ([, v]) => v !== undefined && v !== null && v !== ""
            )
          );

          const res = await api.get(url, { params: cleanParams });

          return {
            key,
            data: res.data?.data ?? res.data ?? []
          };
        })
      );

      // 🔥 convert array → object
      return results.reduce((acc, curr) => {
        acc[curr.key] = curr.data;
        return acc;
      }, {});
    },

    staleTime: 1000 * 60 * 5,
    keepPreviousData: true,
    ...options,
  });
};