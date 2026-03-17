import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateInspectionRequest, type UpdateInspectionRequest, type CreateDefectRequest, type UpdateDefectRequest } from "@shared/routes";

export function useAllInspections() {
  return useQuery({
    queryKey: [api.inspections.listAll.path],
    queryFn: async () => {
      const res = await fetch(api.inspections.listAll.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch inspections");
      return res.json();
    },
  });
}

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
      queryClient.invalidateQueries({ queryKey: [api.inspections.listAll.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

export function useDeleteInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: number; projectId: number }) => {
      const url = buildUrl(api.inspections.delete.path, { id });
      const res = await fetch(url, {
        method: 'DELETE',
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete inspection");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.inspections.list.path, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: [api.inspections.listAll.path] });
      queryClient.invalidateQueries({ queryKey: [api.defects.summary.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

export function useUpdateInspection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, data }: { id: number; projectId: number; data: UpdateInspectionRequest }) => {
      const url = buildUrl(api.inspections.update.path, { id });
      const res = await fetch(url, {
        method: api.inspections.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update inspection");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.inspections.list.path, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: [api.inspections.listAll.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
    },
  });
}

export function useCreateDefect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ inspectionId, projectId, data }: { inspectionId: number; projectId: number; data: CreateDefectRequest }) => {
      const url = buildUrl(api.defects.create.path, { inspectionId });
      const res = await fetch(url, {
        method: api.defects.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create defect");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.inspections.list.path, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: [api.inspections.listAll.path] });
      queryClient.invalidateQueries({ queryKey: [api.defects.summary.path] });
    },
  });
}

export function useUpdateDefect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId, data }: { id: number; projectId: number; data: UpdateDefectRequest }) => {
      const url = buildUrl(api.defects.update.path, { id });
      const res = await fetch(url, {
        method: api.defects.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update defect");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.inspections.list.path, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: [api.inspections.listAll.path] });
      queryClient.invalidateQueries({ queryKey: [api.defects.summary.path] });
    },
  });
}

export function useDeleteDefect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: number; projectId: number }) => {
      const url = buildUrl(api.defects.delete.path, { id });
      const res = await fetch(url, {
        method: 'DELETE',
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete defect");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.inspections.list.path, variables.projectId] });
      queryClient.invalidateQueries({ queryKey: [api.inspections.listAll.path] });
      queryClient.invalidateQueries({ queryKey: [api.defects.summary.path] });
    },
  });
}
