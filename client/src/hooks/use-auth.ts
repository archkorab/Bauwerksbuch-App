import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@shared/models/auth";

type SafeUser = Omit<User, "password"> & {
  impersonating?: boolean;
  adminName?: string;
};

async function fetchUser(): Promise<SafeUser | null> {
  const response = await fetch("/api/auth/user", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

export function useAuth() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery<SafeUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/user"], null);
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Login fehlgeschlagen");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; firstName?: string; lastName?: string; role?: string }) => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Registrierung fehlgeschlagen");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/impersonate/${userId}`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Impersonation fehlgeschlagen");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  const stopImpersonationMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/stop-impersonation", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Fehler beim Beenden");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isImpersonating: !!user?.impersonating,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    login: loginMutation,
    register: registerMutation,
    impersonate: impersonateMutation,
    stopImpersonation: stopImpersonationMutation,
  };
}
