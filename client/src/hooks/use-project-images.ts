import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useProjectImages(projectId: number) {
  return useQuery({
    queryKey: ['/api/projects/images', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/images`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch project images");
      return await res.json();
    },
    enabled: !!projectId,
  });
}

export function useUploadProjectImages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, files }: { projectId: number; files: File[] }) => {
      const formData = new FormData();
      files.forEach(f => formData.append('images', f));
      const res = await fetch(`/api/projects/${projectId}/images`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to upload images");
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects/images', variables.projectId] });
    },
  });
}

export function useDeleteProjectImage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: number; projectId: number }) => {
      const res = await fetch(`/api/project-images/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete image");
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects/images', variables.projectId] });
    },
  });
}
