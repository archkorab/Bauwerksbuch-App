import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password: _, ...safeUser } = user;

      const impersonatingFrom = req.impersonatingFrom;
      if (impersonatingFrom) {
        const adminUser = await authStorage.getUser(impersonatingFrom);
        return res.json({
          ...safeUser,
          impersonating: true,
          adminName: adminUser ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || adminUser.email : 'Admin',
        });
      }

      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/admin/impersonate/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const { db } = await import("../../db");
      const { profiles } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const [adminProfile] = await db.select().from(profiles).where(eq(profiles.userId, adminId));
      if (!adminProfile || adminProfile.role !== "admin") {
        return res.status(403).json({ message: "Nur Administratoren können Benutzer imitieren" });
      }

      const targetUserId = req.params.userId;
      const targetUser = await authStorage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "Benutzer nicht gefunden" });
      }

      (req.session as any).impersonatingFrom = adminId;
      (req.session as any).userId = targetUserId;

      const { password: _, ...safeUser } = targetUser;
      res.json({ ...safeUser, impersonating: true });
    } catch (error) {
      console.error("Impersonation error:", error);
      res.status(500).json({ message: "Impersonation fehlgeschlagen" });
    }
  });

  app.post("/api/admin/stop-impersonation", isAuthenticated, async (req: any, res) => {
    try {
      const adminId = (req.session as any).impersonatingFrom;
      if (!adminId) {
        return res.status(400).json({ message: "Keine aktive Impersonation" });
      }

      (req.session as any).userId = adminId;
      delete (req.session as any).impersonatingFrom;

      const adminUser = await authStorage.getUser(adminId);
      if (!adminUser) {
        return res.status(404).json({ message: "Admin-Benutzer nicht gefunden" });
      }

      const { password: _, ...safeUser } = adminUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Stop impersonation error:", error);
      res.status(500).json({ message: "Fehler beim Beenden der Impersonation" });
    }
  });
}
