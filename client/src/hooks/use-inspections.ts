import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateInspectionRequest } from "@shared/routes";

export function useInspections(projectId: number) {
  return useQuery({
    queryKey: [api.inspections.list.path, projectId],
    queryFn: async () => {
      const url = buildUrl(api.inspections.list.path, { projectId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch inspections");
      const data = await res.json();
      return api.inspections.list.responses[200].parse(data);
    },
    enabled: !!projectId,
  });
}

export function useCreateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: CreateInspectionRequest }) => {
      const url = buildUrl(api.inspections.create.path, { projectId });
      const res = await fetch(url, {
        method: api.inspections.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create inspection");
      const resData = await res.json();
      return api.inspections.create.responses[201].parse(resData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.inspections.list.path, variables.projectId] });
    },
  });
}
