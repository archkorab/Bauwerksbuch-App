import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateEventRequest } from "@shared/routes";

export function useEvents(projectId?: number) {
  return useQuery({
    queryKey: [api.events.list.path, projectId],
    queryFn: async () => {
      let url = api.events.list.path;
      if (projectId) {
        url += `?projectId=${projectId}`;
      }
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = await res.json();
      return api.events.list.responses[200].parse(data);
    },
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateEventRequest) => {
      const res = await fetch(api.events.create.path, {
        method: api.events.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create event");
      const resData = await res.json();
      return api.events.create.responses[201].parse(resData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.events.list.path] });
    },
  });
}
