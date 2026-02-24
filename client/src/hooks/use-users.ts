import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useClients() {
  return useQuery({
    queryKey: [api.users.listClients.path],
    queryFn: async () => {
      const res = await fetch(api.users.listClients.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch clients");
      const data = await res.json();
      return api.users.listClients.responses[200].parse(data);
    },
  });
}

export function useEngineers() {
  return useQuery({
    queryKey: [api.users.listEngineers.path],
    queryFn: async () => {
      const res = await fetch(api.users.listEngineers.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch engineers");
      const data = await res.json();
      return api.users.listEngineers.responses[200].parse(data);
    },
  });
}
