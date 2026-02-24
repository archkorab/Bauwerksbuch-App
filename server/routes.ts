import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { sql } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  // --- Profiles ---
  app.get(api.profiles.get.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (!profile) {
        const allProfiles = await storage.getAllProfiles();
        const role = allProfiles.length === 0 ? "admin" : "client";
        const newProfile = await storage.upsertProfile({ userId, role });
        return res.json(newProfile);
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put(api.profiles.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updates = api.profiles.update.input.parse(req.body);
      const profile = await storage.updateProfile(userId, updates);
      res.json(profile);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // --- Users (admin only) ---
  app.get(api.users.listAll.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get(api.users.listClients.path, isAuthenticated, async (req: any, res) => {
    try {
      const clients = await storage.getUsersByRole("client");
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get(api.users.listEngineers.path, isAuthenticated, async (req: any, res) => {
    try {
      const engineers = await storage.getUsersByRole("engineer");
      res.json(engineers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch engineers" });
    }
  });

  app.put(api.users.updateRole.path, isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const currentProfile = await storage.getProfile(currentUserId);
      if (currentProfile?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const targetUserId = req.params.userId;
      if (targetUserId === currentUserId) {
        return res.status(400).json({ message: "Cannot change your own role" });
      }
      const { role } = api.users.updateRole.input.parse(req.body);
      const existingProfile = await storage.getProfile(targetUserId);
      if (!existingProfile) {
        const newProfile = await storage.upsertProfile({ userId: targetUserId, role });
        return res.json(newProfile);
      }
      const updated = await storage.updateProfile(targetUserId, { role });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.delete(api.users.delete.path, isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const currentProfile = await storage.getProfile(currentUserId);
      if (currentProfile?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const targetUserId = req.params.userId;
      if (targetUserId === currentUserId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      await storage.deleteUser(targetUserId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // --- Projects ---
  app.get(api.projects.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      const role = profile?.role || "client";

      if (role === "admin" || role === "engineer") {
        const allProjects = await storage.getProjects();
        return res.json(allProjects);
      }
      const clientProjects = await storage.getProjects(userId);
      res.json(clientProjects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get(api.projects.get.path, isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      const role = profile?.role || "client";
      if (role === "client" && project.clientId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post(api.projects.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (profile?.role !== "admin" && profile?.role !== "engineer") {
        return res.status(403).json({ message: "Only admins and engineers can create projects" });
      }
      const input = api.projects.create.input.parse(req.body);
      const project = await storage.createProject(input);
      res.status(201).json(project);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put(api.projects.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (profile?.role !== "admin" && profile?.role !== "engineer") {
        return res.status(403).json({ message: "Only admins and engineers can update projects" });
      }
      const id = parseInt(req.params.id, 10);
      const input = api.projects.update.input.parse(req.body);
      const project = await storage.updateProject(id, input);
      if (!project) return res.status(404).json({ message: "Project not found" });
      res.json(project);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Helper to check project access for clients
  async function checkProjectAccess(userId: string, projectId: number): Promise<boolean> {
    const profile = await storage.getProfile(userId);
    if (profile?.role === "admin" || profile?.role === "engineer") return true;
    const project = await storage.getProject(projectId);
    return project?.clientId === userId;
  }

  // --- Documents ---
  app.get(api.documents.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const userId = req.user.claims.sub;
      if (!(await checkProjectAccess(userId, projectId))) {
        return res.status(404).json({ message: "Project not found" });
      }
      const docs = await storage.getDocuments(projectId);
      res.json(docs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post(api.documents.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const userId = req.user.claims.sub;
      const input = { ...req.body, projectId, uploadedBy: userId };
      const doc = await storage.createDocument(input);
      res.status(201).json(doc);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.delete(api.documents.delete.path, isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await storage.deleteDocument(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // --- Events ---
  app.get(api.events.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string, 10) : undefined;
      
      if (projectId) {
        if (!(await checkProjectAccess(userId, projectId))) {
          return res.status(404).json({ message: "Project not found" });
        }
        const projectEvents = await storage.getEvents(projectId);
        return res.json(projectEvents);
      }
      
      if (profile?.role === "admin" || profile?.role === "engineer") {
        const allEvents = await storage.getEvents();
        return res.json(allEvents);
      }
      
      const clientProjects = await storage.getProjects(userId);
      const clientProjectIds = clientProjects.map(p => p.id);
      const allEvents = await storage.getEvents();
      const filteredEvents = allEvents.filter(e => e.projectId && clientProjectIds.includes(e.projectId));
      res.json(filteredEvents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post(api.events.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (profile?.role !== "admin" && profile?.role !== "engineer") {
        return res.status(403).json({ message: "Only admins and engineers can create events" });
      }
      const input = api.events.create.input.parse(req.body);
      const event = await storage.createEvent(input);
      res.status(201).json(event);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.put(api.events.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const input = api.events.update.input.parse(req.body);
      const event = await storage.updateEvent(id, input);
      if (!event) return res.status(404).json({ message: "Event not found" });
      res.json(event);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete(api.events.delete.path, isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await storage.deleteEvent(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // --- Inspections ---
  app.get(api.inspections.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const userId = req.user.claims.sub;
      if (!(await checkProjectAccess(userId, projectId))) {
        return res.status(404).json({ message: "Project not found" });
      }
      const insps = await storage.getInspections(projectId);
      res.json(insps);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inspections" });
    }
  });

  app.post(api.inspections.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (profile?.role !== "admin" && profile?.role !== "engineer") {
        return res.status(403).json({ message: "Only admins and engineers can create inspections" });
      }
      const projectId = parseInt(req.params.projectId, 10);
      const body = req.body;
      const input = { 
        ...body, 
        projectId, 
        engineerId: userId,
        date: new Date(body.date),
      };
      const insp = await storage.createInspection(input);
      res.status(201).json(insp);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to create inspection" });
    }
  });

  app.put(api.inspections.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const input = api.inspections.update.input.parse(req.body);
      const insp = await storage.updateInspection(id, input);
      if (!insp) return res.status(404).json({ message: "Inspection not found" });
      res.json(insp);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to update inspection" });
    }
  });

  // --- Defects ---
  app.get(api.defects.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const inspectionId = parseInt(req.params.inspectionId, 10);
      const defectList = await storage.getDefects(inspectionId);
      res.json(defectList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch defects" });
    }
  });

  app.post(api.defects.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (profile?.role !== "admin" && profile?.role !== "engineer") {
        return res.status(403).json({ message: "Only admins and engineers can create defects" });
      }
      const inspectionId = parseInt(req.params.inspectionId, 10);
      const input = { ...req.body, inspectionId };
      const defect = await storage.createDefect(input);
      res.status(201).json(defect);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to create defect" });
    }
  });

  app.put(api.defects.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const input = api.defects.update.input.parse(req.body);
      const defect = await storage.updateDefect(id, input);
      if (!defect) return res.status(404).json({ message: "Defect not found" });
      res.json(defect);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to update defect" });
    }
  });

  // Seed the database with sample data on startup
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  try {
    const existingProjects = await storage.getProjects();
    if (existingProjects.length > 0) return;

    const { db: database } = await import("./db");
    const { users: usersTable, profiles: profilesTable } = await import("@shared/schema");

    const demoUserId = "demo-admin-001";
    const demoClientId = "demo-client-001";
    const demoEngineerId = "demo-engineer-001";

    await database.insert(usersTable).values([
      { id: demoUserId, email: "admin@archkorab.at", firstName: "Thomas", lastName: "Archkorab" },
      { id: demoClientId, email: "client@wienerhaus.at", firstName: "Maria", lastName: "Huber" },
      { id: demoEngineerId, email: "engineer@archkorab.at", firstName: "Stefan", lastName: "Wagner" },
    ]).onConflictDoNothing();

    await database.insert(profilesTable).values([
      { userId: demoUserId, role: "admin", company: "Archkorab GmbH" },
      { userId: demoClientId, role: "client", company: "Wiener Hausverwaltung" },
      { userId: demoEngineerId, role: "engineer", company: "Archkorab GmbH" },
    ]).onConflictDoUpdate({
      target: profilesTable.userId,
      set: { company: sql`EXCLUDED.company` },
    });

    const project1 = await storage.createProject({
      clientId: demoClientId,
      name: "Wohnhaus Meidlinger Hauptstrasse 42",
      address: "Meidlinger Hauptstrasse 42, 1120 Wien",
      latitude: "48.1753",
      longitude: "16.3282",
      status: "active",
      nextInspectionDue: new Date("2026-04-15"),
    });

    const project2 = await storage.createProject({
      clientId: demoClientId,
      name: "Burogebude Mariahilfer Strasse 88",
      address: "Mariahilfer Strasse 88, 1070 Wien",
      latitude: "48.1966",
      longitude: "16.3459",
      status: "active",
      nextInspectionDue: new Date("2026-03-20"),
    });

    const project3 = await storage.createProject({
      clientId: demoClientId,
      name: "Altbauwohnung Josefstadt",
      address: "Josefstadter Strasse 15, 1080 Wien",
      latitude: "48.2106",
      longitude: "16.3494",
      status: "completed",
    });

    await storage.createEvent({ projectId: project1.id, title: "Annual Building Inspection", description: "Yearly structural assessment of facade and common areas", date: new Date("2026-04-15"), type: "inspection" });
    await storage.createEvent({ projectId: project1.id, title: "Fire Safety Certificate Renewal", description: "Due for recertification per local regulation", date: new Date("2026-05-01"), type: "deadline" });
    await storage.createEvent({ projectId: project2.id, title: "HVAC System Check", description: "Quarterly heating and ventilation inspection", date: new Date("2026-03-20"), type: "visit" });
    await storage.createEvent({ projectId: project2.id, title: "Elevator Safety Inspection", description: "Mandatory annual elevator check", date: new Date("2026-06-10"), type: "inspection" });
    await storage.createEvent({ projectId: project3.id, title: "Final Documentation Delivery", description: "All building documentation compiled and delivered to client", date: new Date("2025-11-20"), type: "deadline" });

    const insp1 = await storage.createInspection({ projectId: project1.id, engineerId: demoEngineerId, date: new Date("2025-09-15"), status: "OK", notes: "Primary building inspection - facade and common areas assessed." });
    const insp2 = await storage.createInspection({ projectId: project1.id, engineerId: demoEngineerId, date: new Date("2025-03-10"), status: "needs_repair", notes: "Primary inspection - roof and drainage systems." });
    const insp3 = await storage.createInspection({ projectId: project2.id, engineerId: demoEngineerId, date: new Date("2025-12-01"), status: "OK", notes: "Primary inspection - all building systems." });
    const insp4 = await storage.createInspection({ projectId: project3.id, engineerId: demoEngineerId, date: new Date("2025-10-05"), status: "urgent", notes: "Primary inspection - basement and structural elements." });

    // Defects for inspection 1 (primary + follow-up)
    const d1 = await storage.createDefect({ inspectionId: insp1.id, defectId: "DEF-001", dateFound: new Date("2025-09-15"), description: "Minor hairline crack in stairwell wall, 2nd floor landing", location: "Stairwell, 2nd Floor", status: "open" });
    await storage.createDefect({ inspectionId: insp1.id, defectId: "DEF-001-F1", dateFound: new Date("2025-11-20"), description: "Follow-up: crack unchanged, no structural concern. Cosmetic repair scheduled.", location: "Stairwell, 2nd Floor", status: "in_progress", parentDefectId: d1.id });

    // Defects for inspection 2
    const d2 = await storage.createDefect({ inspectionId: insp2.id, defectId: "DEF-002", dateFound: new Date("2025-03-10"), description: "Roof drainage partially blocked with debris and leaves", location: "Roof, Northwest corner", status: "open" });
    await storage.createDefect({ inspectionId: insp2.id, defectId: "DEF-003", dateFound: new Date("2025-03-10"), description: "Gutter joint separated at south-facing section", location: "Roof gutter, South side", status: "open" });
    await storage.createDefect({ inspectionId: insp2.id, defectId: "DEF-002-F1", dateFound: new Date("2025-05-18"), description: "Follow-up: drainage cleaned, flow restored. Monitoring for recurrence.", location: "Roof, Northwest corner", status: "resolved", parentDefectId: d2.id });

    // Defects for inspection 3
    await storage.createDefect({ inspectionId: insp3.id, defectId: "DEF-004", dateFound: new Date("2025-12-01"), description: "HVAC filter at 85% capacity, replacement recommended within 30 days", location: "Mechanical Room, Basement Level B1", status: "in_progress" });

    // Defects for inspection 4 (urgent)
    const d5 = await storage.createDefect({ inspectionId: insp4.id, defectId: "DEF-005", dateFound: new Date("2025-10-05"), description: "Active water infiltration through basement wall, approx. 2m2 affected area", location: "Basement, East wall", status: "open" });
    await storage.createDefect({ inspectionId: insp4.id, defectId: "DEF-006", dateFound: new Date("2025-10-05"), description: "Efflorescence and salt deposits on foundation wall indicating ongoing moisture", location: "Basement, Foundation wall SE corner", status: "open" });
    await storage.createDefect({ inspectionId: insp4.id, defectId: "DEF-005-F1", dateFound: new Date("2025-12-10"), description: "Follow-up: waterproofing membrane applied, dehumidifier installed. Area drying.", location: "Basement, East wall", status: "in_progress", parentDefectId: d5.id });

    await storage.createDocument({ projectId: project1.id, name: "Bauwerksbuch 2025 - Meidlinger Hauptstrasse", url: "/docs/bauwerksbuch-meidlinger-2025.pdf", type: "pdf", uploadedBy: demoEngineerId });
    await storage.createDocument({ projectId: project1.id, name: "Facade Inspection Report Sept 2025", url: "/docs/facade-report-sept2025.pdf", type: "pdf", uploadedBy: demoEngineerId });
    await storage.createDocument({ projectId: project2.id, name: "HVAC Maintenance Schedule 2026", url: "/docs/hvac-schedule-2026.pdf", type: "pdf", uploadedBy: demoEngineerId });
    await storage.createDocument({ projectId: project2.id, name: "Building Floor Plans", url: "/docs/mariahilfer-floorplans.pdf", type: "pdf", uploadedBy: demoEngineerId });
    await storage.createDocument({ projectId: project3.id, name: "Final Bauwerksbuch - Josefstadt", url: "/docs/bauwerksbuch-josefstadt-final.pdf", type: "pdf", uploadedBy: demoEngineerId });

    console.log("Database seeded with sample data");
  } catch (error) {
    console.error("Seed error:", error);
  }
}
