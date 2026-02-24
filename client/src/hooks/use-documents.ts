import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertDocument } from "@shared/schema";

export function useDocuments(projectId: number) {
  return useQuery({
    queryKey: [api.documents.list.path, projectId],
    queryFn: async () => {
      const url = buildUrl(api.documents.list.path, { projectId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch documents");
      return api.documents.list.responses[200].parse(await res.json());
    },
    enabled: !!projectId,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertDocument) => {
      const validated = api.documents.create.input.parse(data);
      const url = buildUrl(api.documents.create.path, { projectId: data.projectId });
      const res = await fetch(url, {
        method: api.documents.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to add document metadata");
      return api.documents.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path, variables.projectId] });
    },
  });
}
