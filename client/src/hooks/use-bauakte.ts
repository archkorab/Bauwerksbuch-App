import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useBauakte(projectId: number) {
  return useQuery({
    queryKey: ['/api/projects', projectId, 'bauakte'],
    queryFn: async () => {
      const url = buildUrl(api.bauakte.list.path, { projectId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bauakte");
      return res.json();
    },
    enabled: !!projectId,
  });
}

export function useImportBauakt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, file }: { projectId: number; file: File }) => {
      const url = buildUrl(api.bauakte.import.path, { projectId });
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to import");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', variables.projectId, 'bauakte'] });
    },
  });
}

export function useUploadBauaktFiles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, files }: { projectId: number; files: FileList }) => {
      const url = buildUrl(api.bauakte.uploadFile.path, { projectId });
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      const res = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to upload files");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', variables.projectId, 'bauakte'] });
    },
  });
}
