import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useClients() {
  return useQuery({
    queryKey: [api.users.listClients.path],
    queryFn: async () => {
      const res = await fetch(api.users.listClients.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch clients");
      return api.users.listClients.responses[200].parse(await res.json());
    },
  });
}

export function useEngineers() {
  return useQuery({
    queryKey: [api.users.listEngineers.path],
    queryFn: async () => {
      const res = await fetch(api.users.listEngineers.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch engineers");
      return api.users.listEngineers.responses[200].parse(await res.json());
    },
  });
}

export function useMyProfile() {
  return useQuery({
    queryKey: [api.profiles.get.path],
    queryFn: async () => {
      const res = await fetch(api.profiles.get.path, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch profile");
      return api.profiles.get.responses[200].parse(await res.json());
    },
  });
}
