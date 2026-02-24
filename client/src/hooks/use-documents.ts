import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateDocumentRequest } from "@shared/routes";

export function useDocuments(projectId: number) {
  return useQuery({
    queryKey: [api.documents.list.path, projectId],
    queryFn: async () => {
      const url = buildUrl(api.documents.list.path, { projectId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      return api.documents.list.responses[200].parse(data);
    },
    enabled: !!projectId,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: number; data: CreateDocumentRequest }) => {
      const url = buildUrl(api.documents.create.path, { projectId });
      const res = await fetch(url, {
        method: api.documents.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create document metadata");
      const resData = await res.json();
      return api.documents.create.responses[201].parse(resData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path, variables.projectId] });
    },
  });
}
