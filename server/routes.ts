import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { authStorage } from "./replit_integrations/auth/storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { sql } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import XLSX from "xlsx";
import bcrypt from "bcryptjs";

const uploadsBaseDir = path.join(process.cwd(), "uploads", "bauakt");
fs.mkdirSync(uploadsBaseDir, { recursive: true });

function getProjectUploadsDir(projectId: number): string {
  const dir = path.join(uploadsBaseDir, String(projectId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const bauaktUpload = multer({
  storage: multer.diskStorage({
    destination: (req: any, _file, cb) => {
      const projectId = parseInt(req.params.projectId, 10);
      cb(null, getProjectUploadsDir(projectId));
    },
    filename: (_req, file, cb) => {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      cb(null, originalName);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
});

const documentsBaseDir = path.join(process.cwd(), "uploads", "documents");
fs.mkdirSync(documentsBaseDir, { recursive: true });

function getProjectDocumentsDir(projectId: number): string {
  const dir = path.join(documentsBaseDir, String(projectId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const documentUpload = multer({
  storage: multer.diskStorage({
    destination: (req: any, _file, cb) => {
      const projectId = parseInt(req.params.projectId, 10);
      cb(null, getProjectDocumentsDir(projectId));
    },
    filename: (_req, file, cb) => {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const timestamp = Date.now();
      const ext = path.extname(originalName);
      const base = path.basename(originalName, ext);
      cb(null, `${base}_${timestamp}${ext}`);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
});

const projectImagesBaseDir = path.join(process.cwd(), "uploads", "project-images");
fs.mkdirSync(projectImagesBaseDir, { recursive: true });

function getProjectImagesDir(projectId: number): string {
  const dir = path.join(projectImagesBaseDir, String(projectId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const projectImageUpload = multer({
  storage: multer.diskStorage({
    destination: (req: any, _file, cb) => {
      const projectId = parseInt(req.params.projectId, 10);
      cb(null, getProjectImagesDir(projectId));
    },
    filename: (_req, file, cb) => {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const timestamp = Date.now();
      const ext = path.extname(originalName);
      const base = path.basename(originalName, ext);
      cb(null, `${base}_${timestamp}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt.'));
    }
  },
});

const defectImagesBaseDir = path.join(process.cwd(), "uploads", "defect-images");
fs.mkdirSync(defectImagesBaseDir, { recursive: true });

function getDefectImagesDir(defectId: number): string {
  const dir = path.join(defectImagesBaseDir, String(defectId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const defectImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req: any, _file, cb) => {
      const tmpDir = path.join(defectImagesBaseDir, "tmp");
      fs.mkdirSync(tmpDir, { recursive: true });
      cb(null, tmpDir);
    },
    filename: (_req, file, cb) => {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const timestamp = Date.now();
      const ext = path.extname(originalName);
      const base = path.basename(originalName, ext);
      cb(null, `${base}_${timestamp}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt.'));
    }
  },
});

const profileImagesDir = path.join(process.cwd(), "uploads", "profile-images");
fs.mkdirSync(profileImagesDir, { recursive: true });

const profileImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req: any, _file, cb) => {
      cb(null, profileImagesDir);
    },
    filename: (req: any, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${(req as any).user?.claims?.sub || 'unknown'}_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt.'));
    }
  },
});

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  // --- Google Places Autocomplete Proxy ---
  app.get("/api/places/autocomplete", isAuthenticated, async (req: any, res) => {
    try {
      const input = req.query.input as string;
      if (!input || input.length < 2) {
        return res.json({ predictions: [] });
      }
      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google Maps API key not configured" });
      }
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=address&components=country:at&language=de&key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      res.json({ predictions: data.predictions || [] });
    } catch (error) {
      console.error("Places autocomplete error:", error);
      res.status(500).json({ error: "Failed to fetch address suggestions" });
    }
  });

  // --- Profiles ---
  app.get(api.profiles.get.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (!profile) {
        const allProfiles = await storage.getAllProfiles();
        const role = allProfiles.length === 0 ? "admin" : "eigentuemer";
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

  app.put("/api/account/update", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName, phone, company, currentPassword, newPassword } = req.body;

      await storage.updateUser(userId, { firstName, lastName }, { phone, company });

      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Aktuelles Passwort ist erforderlich" });
        }
        const user = await authStorage.getUser(userId);
        if (!user?.password) {
          return res.status(400).json({ message: "Kein Passwort gesetzt" });
        }
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) {
          return res.status(400).json({ message: "Aktuelles Passwort ist falsch" });
        }
        if (newPassword.length < 6) {
          return res.status(400).json({ message: "Neues Passwort muss mindestens 6 Zeichen lang sein" });
        }
        const hashed = await bcrypt.hash(newPassword, 12);
        const { db: database } = await import("./db");
        const { users: usersTable } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");
        await database.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, userId));
      }

      const updatedUser = await authStorage.getUser(userId);
      const profile = await storage.getProfile(userId);
      const { password: _, ...safeUser } = updatedUser!;
      res.json({ ...safeUser, profile });
    } catch (err) {
      console.error("Account update error:", err);
      res.status(500).json({ message: "Profil konnte nicht aktualisiert werden" });
    }
  });

  app.post("/api/account/profile-image", isAuthenticated, profileImageUpload.single("image"), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!req.file) {
        return res.status(400).json({ message: "Kein Bild hochgeladen" });
      }
      const imageUrl = `/uploads/profile-images/${req.file.filename}`;
      const { db: database } = await import("./db");
      const { users: usersTable } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      const oldUser = await authStorage.getUser(userId);
      if (oldUser?.profileImageUrl) {
        const oldPath = path.join(process.cwd(), oldUser.profileImageUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      await database.update(usersTable).set({ profileImageUrl: imageUrl }).where(eq(usersTable.id, userId));
      res.json({ profileImageUrl: imageUrl });
    } catch (err) {
      console.error("Profile image upload error:", err);
      res.status(500).json({ message: "Bild konnte nicht hochgeladen werden" });
    }
  });

  app.get("/uploads/profile-images/:filename", (req, res) => {
    const filePath = path.join(profileImagesDir, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Bild nicht gefunden" });
    res.sendFile(filePath);
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
      const hausverwaltungen = await storage.getUsersByRole("hausverwaltung");
      const eigentuemer = await storage.getUsersByRole("eigentuemer");
      res.json([...hausverwaltungen, ...eigentuemer]);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get(api.users.listEngineers.path, isAuthenticated, async (req: any, res) => {
    try {
      const admins = await storage.getUsersByRole("admin");
      res.json(admins);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admins" });
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

  app.post(api.users.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const currentProfile = await storage.getProfile(currentUserId);
      if (currentProfile?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const input = api.users.create.input.parse(req.body);
      const existingUsers = await storage.getAllUsers();
      const emailExists = existingUsers.find(u => u.email === input.email);
      if (emailExists) {
        return res.status(400).json({ message: "Ein Benutzer mit dieser E-Mail existiert bereits." });
      }
      const passwordToHash = input.password || "changeme123";
      const hashedPassword = await bcrypt.hash(passwordToHash, 12);
      const user = await storage.createUser({
        email: input.email,
        firstName: input.firstName || "",
        lastName: input.lastName || "",
        password: hashedPassword,
      });
      await storage.upsertProfile({
        userId: user.id,
        role: input.role,
        company: input.company || null,
        phone: input.phone || null,
      });
      const fullUser = await storage.getUserWithProfile(user.id);
      res.status(201).json(fullUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      console.error("Create user error:", err);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put(api.users.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const currentProfile = await storage.getProfile(currentUserId);
      if (currentProfile?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const targetUserId = req.params.userId;
      const input = api.users.update.input.parse(req.body);
      const { firstName, lastName, email, role, company, phone, newPassword } = input;
      const updated = await storage.updateUser(
        targetUserId,
        { firstName, lastName, email },
        { role, company, phone }
      );
      if (!updated) return res.status(404).json({ message: "User not found" });

      if (newPassword) {
        const hashed = await bcrypt.hash(newPassword, 12);
        const { db: database } = await import("./db");
        const { users: usersTable } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");
        await database.update(usersTable).set({ password: hashed }).where(eq(usersTable.id, targetUserId));
      }

      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to update user" });
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
      const role = profile?.role || "eigentuemer";

      if (role === "admin") {
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
      const role = profile?.role || "eigentuemer";
      if (role !== "admin" && project.clientId !== userId) {
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
      if (!profile || !["admin", "hausverwaltung", "eigentuemer"].includes(profile.role)) {
        return res.status(403).json({ message: "Keine Berechtigung zum Erstellen von Projekten" });
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
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Nur Administratoren können Projekte bearbeiten" });
      }
      const id = parseInt(req.params.id, 10);
      const body = { ...req.body };
      if (body.nextInspectionDue && typeof body.nextInspectionDue === 'string') {
        body.nextInspectionDue = new Date(body.nextInspectionDue);
      }
      const input = api.projects.update.input.parse(body);
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
    if (profile?.role === "admin") return true;
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

  app.post(api.documents.create.path, isAuthenticated, documentUpload.single('file'), async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (!profile || profile.role !== "admin") {
        return res.status(403).json({ message: "Nur Administratoren können Dokumente hochladen" });
      }
      const file = req.file as Express.Multer.File | undefined;
      const name = req.body.name || (file ? file.filename : "Unnamed");
      const type = req.body.type || (file ? path.extname(file.originalname).replace('.', '') : "pdf");
      let url = req.body.url || "";
      if (file) {
        url = `/api/document-files/${projectId}/${encodeURIComponent(file.filename)}`;
      }
      const input = { projectId, name, url, type, uploadedBy: userId };
      const doc = await storage.createDocument(input);
      res.status(201).json(doc);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      console.error("Document upload error:", err);
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.get('/api/document-files/:projectId/:filename', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const projectId = parseInt(req.params.projectId, 10);
    if (!(await checkProjectAccess(userId, projectId))) {
      return res.status(403).json({ message: "Access denied" });
    }
    const filename = decodeURIComponent(req.params.filename);
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ message: "Invalid filename" });
    }
    const filePath = path.join(getProjectDocumentsDir(projectId), filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }
    res.sendFile(filePath);
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
      
      if (profile?.role === "admin") {
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
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Nur Administratoren können Ereignisse erstellen" });
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
  app.get(api.inspections.listAll.path, isAuthenticated, async (req: any, res) => {
    try {
      const allInsps = await storage.getAllInspections();
      res.json(allInsps);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch inspections" });
    }
  });

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
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Nur Administratoren können Prüfungen erstellen" });
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
      const body = { ...req.body };
      if (body.date && typeof body.date === 'string') body.date = new Date(body.date);
      const input = api.inspections.update.input.parse(body);
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

  app.delete(api.inspections.delete.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Nur Administratoren können Prüfungen löschen" });
      }
      const id = parseInt(req.params.id, 10);
      await storage.deleteInspection(id);
      res.json({ message: "Inspection deleted" });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete inspection" });
    }
  });

  // --- Defects ---
  app.get(api.defects.summary.path, isAuthenticated, async (req: any, res) => {
    try {
      const allProjects = await storage.getProjects();
      const results: { projectId: number; mangelStatus: string }[] = [];
      for (const project of allProjects) {
        const projectInspections = await storage.getInspections(project.id);
        let worstStatus = "kein_mangel";
        for (const insp of projectInspections) {
          const inspDefects = await storage.getDefects(insp.id);
          for (const defect of inspDefects) {
            if (defect.status === "grober_mangel") {
              worstStatus = "grober_mangel";
            } else if (defect.status === "leichter_mangel" && worstStatus !== "grober_mangel") {
              worstStatus = "leichter_mangel";
            }
          }
        }
        results.push({ projectId: project.id, mangelStatus: worstStatus });
      }
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch defect summary" });
    }
  });

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
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Nur Administratoren können Mängel erstellen" });
      }
      const inspectionId = parseInt(req.params.inspectionId, 10);
      const body = { ...req.body };
      if (body.dateFound && typeof body.dateFound === 'string') body.dateFound = new Date(body.dateFound);
      if (body.repairDue && typeof body.repairDue === 'string') body.repairDue = new Date(body.repairDue);
      if (!body.frist || body.frist === '') body.frist = null;
      if (!body.repairDue || body.repairDue === '') body.repairDue = null;
      const input = { ...body, inspectionId };
      const defect = await storage.createDefect(input);
      res.status(201).json(defect);
    } catch (err) {
      console.error("Defect creation error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Failed to create defect" });
    }
  });

  app.put(api.defects.update.path, isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const body = { ...req.body };
      if (body.dateFound && typeof body.dateFound === 'string') body.dateFound = new Date(body.dateFound);
      if (body.repairDue && typeof body.repairDue === 'string') body.repairDue = new Date(body.repairDue);
      if (body.frist === '') body.frist = null;
      if (body.repairDue === '') body.repairDue = null;
      const input = api.defects.update.input.parse(body);
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

  app.delete(api.defects.delete.path, isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      await storage.deleteDefect(id);
      res.json({ message: "Defect deleted" });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete defect" });
    }
  });

  // --- Project Images ---
  app.get('/api/projects/:projectId/images', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const userId = req.user.claims.sub;
      if (!(await checkProjectAccess(userId, projectId))) {
        return res.status(403).json({ message: "Access denied" });
      }
      const images = await storage.getProjectImages(projectId);
      res.json(images);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch project images" });
    }
  });

  app.post('/api/projects/:projectId/images', isAuthenticated, projectImageUpload.array('images', 20), async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (!profile || profile.role !== "admin") {
        return res.status(403).json({ message: "Nur Administratoren können Bilder hochladen" });
      }
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "Keine Dateien hochgeladen" });
      }
      const created = [];
      for (const file of files) {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const url = `/api/project-image-files/${projectId}/${encodeURIComponent(file.filename)}`;
        const img = await storage.createProjectImage({ projectId, name: originalName, url, uploadedBy: userId });
        created.push(img);
      }
      res.status(201).json(created);
    } catch (err) {
      console.error("Project image upload error:", err);
      res.status(500).json({ message: "Failed to upload project images" });
    }
  });

  app.get('/api/project-image-files/:projectId/:filename', isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      const userId = req.user.claims.sub;
      if (!(await checkProjectAccess(userId, projectId))) {
        return res.status(403).json({ message: "Access denied" });
      }
      const filename = decodeURIComponent(req.params.filename);
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ message: "Invalid filename" });
      }
      const filePath = path.join(getProjectImagesDir(projectId), filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Image not found" });
      }
      res.sendFile(filePath);
    } catch (err) {
      res.status(500).json({ message: "Failed to serve project image" });
    }
  });

  app.delete('/api/project-images/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (!profile || profile.role !== "admin") {
        return res.status(403).json({ message: "Nur Administratoren können Bilder löschen" });
      }
      await storage.deleteProjectImage(id);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ message: "Failed to delete project image" });
    }
  });

  // --- Defect Image Upload ---
  app.post('/api/defects/:defectId/image', isAuthenticated, defectImageUpload.single('image'), async (req: any, res) => {
    try {
      const defectId = parseInt(req.params.defectId, 10);
      if (!req.file) return res.status(400).json({ message: "No image file provided" });
      
      const finalDir = getDefectImagesDir(defectId);
      const finalPath = path.join(finalDir, req.file.filename);
      fs.renameSync(req.file.path, finalPath);
      
      const imageUrl = `/api/defect-images/${defectId}/${encodeURIComponent(req.file.filename)}`;
      await storage.updateDefect(defectId, { imageUrl });
      
      res.json({ imageUrl });
    } catch (err) {
      res.status(500).json({ message: "Failed to upload defect image" });
    }
  });

  app.get('/api/defect-images/:defectId/:filename', isAuthenticated, async (req: any, res) => {
    try {
      const defectId = parseInt(req.params.defectId, 10);
      const filename = decodeURIComponent(req.params.filename);
      const filePath = path.join(defectImagesBaseDir, String(defectId), filename);
      if (!fs.existsSync(filePath)) return res.status(404).json({ message: "Image not found" });
      res.sendFile(filePath);
    } catch (err) {
      res.status(500).json({ message: "Failed to serve defect image" });
    }
  });

  // --- Bauakt (Digitaler Bauakt) ---
  app.get(api.bauakte.list.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projectId = parseInt(req.params.projectId, 10);
      if (!(await checkProjectAccess(userId, projectId))) {
        return res.status(403).json({ message: "Access denied" });
      }
      const bauakte = await storage.getBauakte(projectId);
      res.json(bauakte);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bauakte" });
    }
  });

  app.post(api.bauakte.import.path, isAuthenticated, excelUpload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Only admins can import bauakt data" });
      }
      const projectId = parseInt(req.params.projectId, 10);
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      if (rows.length < 2) {
        return res.status(400).json({ message: "Excel file has no data rows" });
      }

      const projectDir = getProjectUploadsDir(projectId);
      const entries = rows.slice(1).filter((row: any[]) => row[0]).map((row: any[]) => {
        const dateiname = String(row[0]).trim();
        let fileUrl: string | null = null;
        const extensions = ['.pdf', '.PDF', '.jpg', '.JPG', '.jpeg', '.JPEG', '.png', '.PNG', '.tif', '.TIF', '.tiff', '.TIFF'];
        for (const ext of extensions) {
          if (fs.existsSync(path.join(projectDir, dateiname + ext))) {
            fileUrl = `/api/bauakt-files/${projectId}/${encodeURIComponent(dateiname + ext)}`;
            break;
          }
        }
        if (!fileUrl && fs.existsSync(path.join(projectDir, dateiname))) {
          fileUrl = `/api/bauakt-files/${projectId}/${encodeURIComponent(dateiname)}`;
        }
        return {
          projectId,
          dateiname,
          jahr: row[2] != null ? String(row[2]) : null,
          beschreibung: row[3] != null ? String(row[3]).trim() : null,
          art: row[4] != null ? String(row[4]).trim() : null,
          anmerkung: row[5] != null ? String(row[5]).trim() : null,
          fileUrl,
        };
      });

      await storage.deleteBauakteByProject(projectId);
      const created = await storage.createBauaktBatch(entries);
      res.json({ count: created.length });
    } catch (err) {
      console.error("Bauakt import error:", err);
      res.status(500).json({ message: "Failed to import bauakt data" });
    }
  });

  app.post(api.bauakte.uploadFile.path, isAuthenticated, bauaktUpload.array('files', 100), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getProfile(userId);
      if (profile?.role !== "admin") {
        return res.status(403).json({ message: "Only admins can upload bauakt files" });
      }
      const projectId = parseInt(req.params.projectId, 10);
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const bauakte = await storage.getBauakte(projectId);
      for (const file of files) {
        const filename = file.filename;
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
        const matchingEntry = bauakte.find(b => b.dateiname === nameWithoutExt || b.dateiname === filename);
        if (matchingEntry) {
          const fileUrl = `/api/bauakt-files/${projectId}/${encodeURIComponent(filename)}`;
          await storage.updateBauaktFileUrl(projectId, matchingEntry.dateiname, fileUrl);
        }
      }

      res.json({ filename: files.map(f => f.filename).join(', '), url: 'uploaded' });
    } catch (err) {
      console.error("Bauakt file upload error:", err);
      res.status(500).json({ message: "Failed to upload files" });
    }
  });

  app.get('/api/bauakt-files/:projectId/:filename', isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const projectId = parseInt(req.params.projectId, 10);
    if (!(await checkProjectAccess(userId, projectId))) {
      return res.status(403).json({ message: "Access denied" });
    }
    const filename = decodeURIComponent(req.params.filename);
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ message: "Invalid filename" });
    }
    const filePath = path.join(getProjectUploadsDir(projectId), filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }
    res.sendFile(filePath);
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

    const demoPassword = await bcrypt.hash("admin123", 12);
    await database.insert(usersTable).values([
      { id: demoUserId, email: "admin@archkorab.at", firstName: "Thomas", lastName: "Archkorab", password: demoPassword },
      { id: demoClientId, email: "client@wienerhaus.at", firstName: "Maria", lastName: "Huber", password: demoPassword },
      { id: demoEngineerId, email: "engineer@archkorab.at", firstName: "Stefan", lastName: "Wagner", password: demoPassword },
    ]).onConflictDoNothing();

    await database.insert(profilesTable).values([
      { userId: demoUserId, role: "admin", company: "Archkorab GmbH" },
      { userId: demoClientId, role: "hausverwaltung", company: "Wiener Hausverwaltung" },
      { userId: demoEngineerId, role: "admin", company: "Archkorab GmbH" },
    ]).onConflictDoUpdate({
      target: profilesTable.userId,
      set: { company: sql`EXCLUDED.company` },
    });

    const project1 = await storage.createProject({
      clientId: demoClientId,
      verwaltungId: demoClientId,
      eigentuemer: "Familie Gruber",
      name: "Wohnhaus Meidlinger Hauptstrasse 42",
      address: "Meidlinger Hauptstrasse 42, 1120 Wien",
      latitude: "48.1753",
      longitude: "16.3282",
      status: "active",
      nextInspectionDue: new Date("2026-04-15"),
    });

    const project2 = await storage.createProject({
      clientId: demoClientId,
      verwaltungId: demoClientId,
      eigentuemer: "Immobilien AG Wien",
      name: "Burogebude Mariahilfer Strasse 88",
      address: "Mariahilfer Strasse 88, 1070 Wien",
      latitude: "48.1966",
      longitude: "16.3459",
      status: "active",
      nextInspectionDue: new Date("2026-03-20"),
    });

    const project3 = await storage.createProject({
      clientId: demoClientId,
      verwaltungId: demoClientId,
      eigentuemer: "Dr. Hans Müller",
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
    const d1 = await storage.createDefect({ inspectionId: insp1.id, defectId: "DEF-001", dateFound: new Date("2025-09-15"), description: "Minor hairline crack in stairwell wall, 2nd floor landing", location: "Stairwell, 2nd Floor", status: "leichter_mangel" });
    await storage.createDefect({ inspectionId: insp1.id, defectId: "DEF-001-F1", dateFound: new Date("2025-11-20"), description: "Follow-up: crack unchanged, no structural concern. Cosmetic repair scheduled.", location: "Stairwell, 2nd Floor", status: "leichter_mangel", parentDefectId: d1.id });

    // Defects for inspection 2
    const d2 = await storage.createDefect({ inspectionId: insp2.id, defectId: "DEF-002", dateFound: new Date("2025-03-10"), description: "Roof drainage partially blocked with debris and leaves", location: "Roof, Northwest corner", status: "leichter_mangel" });
    await storage.createDefect({ inspectionId: insp2.id, defectId: "DEF-003", dateFound: new Date("2025-03-10"), description: "Gutter joint separated at south-facing section", location: "Roof gutter, South side", status: "leichter_mangel" });
    await storage.createDefect({ inspectionId: insp2.id, defectId: "DEF-002-F1", dateFound: new Date("2025-05-18"), description: "Follow-up: drainage cleaned, flow restored. Monitoring for recurrence.", location: "Roof, Northwest corner", status: "leichter_mangel", parentDefectId: d2.id });

    // Defects for inspection 3
    await storage.createDefect({ inspectionId: insp3.id, defectId: "DEF-004", dateFound: new Date("2025-12-01"), description: "HVAC filter at 85% capacity, replacement recommended within 30 days", location: "Mechanical Room, Basement Level B1", status: "leichter_mangel" });

    // Defects for inspection 4 (urgent)
    const d5 = await storage.createDefect({ inspectionId: insp4.id, defectId: "DEF-005", dateFound: new Date("2025-10-05"), description: "Active water infiltration through basement wall, approx. 2m2 affected area", location: "Basement, East wall", status: "grober_mangel" });
    await storage.createDefect({ inspectionId: insp4.id, defectId: "DEF-006", dateFound: new Date("2025-10-05"), description: "Efflorescence and salt deposits on foundation wall indicating ongoing moisture", location: "Basement, Foundation wall SE corner", status: "grober_mangel" });
    await storage.createDefect({ inspectionId: insp4.id, defectId: "DEF-005-F1", dateFound: new Date("2025-12-10"), description: "Follow-up: waterproofing membrane applied, dehumidifier installed. Area drying.", location: "Basement, East wall", status: "grober_mangel", parentDefectId: d5.id });

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
