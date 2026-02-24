import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertInspection } from "@shared/schema";

export function useInspections(projectId: number) {
  return useQuery({
    queryKey: [api.inspections.list.path, projectId],
    queryFn: async () => {
      const url = buildUrl(api.inspections.list.path, { projectId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch inspections");
      return api.inspections.list.responses[200].parse(await res.json());
    },
    enabled: !!projectId,
  });
}

export function useCreateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertInspection) => {
      const validated = api.inspections.create.input.parse(data);
      const url = buildUrl(api.inspections.create.path, { projectId: data.projectId! });
      const res = await fetch(url, {
        method: api.inspections.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create inspection");
      return api.inspections.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.inspections.list.path, variables.projectId] });
    },
  });
}
