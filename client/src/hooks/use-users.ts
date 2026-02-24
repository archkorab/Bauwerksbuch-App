import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

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

export function useAllUsers() {
  return useQuery({
    queryKey: [api.users.listAll.path],
    queryFn: async () => {
      const res = await fetch(api.users.listAll.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      return api.users.listAll.responses[200].parse(data);
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const url = buildUrl(api.users.updateRole.path, { userId });
      const res = await fetch(url, {
        method: api.users.updateRole.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update role");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.listAll.path] });
      queryClient.invalidateQueries({ queryKey: [api.users.listClients.path] });
      queryClient.invalidateQueries({ queryKey: [api.users.listEngineers.path] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const url = buildUrl(api.users.delete.path, { userId });
      const res = await fetch(url, {
        method: api.users.delete.method,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.listAll.path] });
      queryClient.invalidateQueries({ queryKey: [api.users.listClients.path] });
      queryClient.invalidateQueries({ queryKey: [api.users.listEngineers.path] });
    },
  });
}
