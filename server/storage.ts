import { db } from "./db";
import {
  profiles,
  projects,
  documents,
  events,
  inspections,
  defects,
  users,
  type Profile,
  type InsertProfile,
  type UpdateProfileRequest,
  type Project,
  type InsertProject,
  type UpdateProjectRequest,
  type ProjectResponse,
  type Document,
  type InsertDocument,
  type Event,
  type InsertEvent,
  type UpdateEventRequest,
  type Inspection,
  type InsertInspection,
  type UpdateInspectionRequest,
  type InspectionResponse,
  type Defect,
  type InsertDefect,
  type UpdateDefectRequest,
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getProfile(userId: string): Promise<Profile | undefined>;
  getAllProfiles(): Promise<Profile[]>;
  upsertProfile(data: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, data: UpdateProfileRequest): Promise<Profile>;
  getUsersByRole(role: string): Promise<any[]>;

  getProjects(clientId?: string): Promise<ProjectResponse[]>;
  getProject(id: number): Promise<ProjectResponse | undefined>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(id: number, data: UpdateProjectRequest): Promise<Project>;

  getDocuments(projectId: number): Promise<Document[]>;
  createDocument(data: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<void>;

  getEvents(projectId?: number): Promise<Event[]>;
  createEvent(data: InsertEvent): Promise<Event>;
  updateEvent(id: number, data: UpdateEventRequest): Promise<Event>;
  deleteEvent(id: number): Promise<void>;

  getInspections(projectId: number): Promise<InspectionResponse[]>;
  createInspection(data: InsertInspection): Promise<Inspection>;
  updateInspection(id: number, data: UpdateInspectionRequest): Promise<Inspection>;

  getDefects(inspectionId: number): Promise<Defect[]>;
  createDefect(data: InsertDefect): Promise<Defect>;
  updateDefect(id: number, data: UpdateDefectRequest): Promise<Defect>;
}

export class DatabaseStorage implements IStorage {
  async getProfile(userId: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    return profile;
  }

  async getAllProfiles(): Promise<Profile[]> {
    return await db.select().from(profiles);
  }

  async upsertProfile(data: InsertProfile): Promise<Profile> {
    const [profile] = await db
      .insert(profiles)
      .values(data)
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { ...data },
      })
      .returning();
    return profile;
  }

  async updateProfile(userId: string, data: UpdateProfileRequest): Promise<Profile> {
    const [updated] = await db
      .update(profiles)
      .set(data)
      .where(eq(profiles.userId, userId))
      .returning();
    return updated;
  }

  async getUsersByRole(role: string): Promise<any[]> {
    const result = await db
      .select()
      .from(users)
      .innerJoin(profiles, eq(users.id, profiles.userId))
      .where(eq(profiles.role, role));
    return result.map(r => ({ ...r.users, profile: r.profiles }));
  }

  async getProjects(clientId?: string): Promise<ProjectResponse[]> {
    if (clientId) {
      const result = await db
        .select()
        .from(projects)
        .leftJoin(users, eq(projects.clientId, users.id))
        .where(eq(projects.clientId, clientId))
        .orderBy(desc(projects.createdAt));
      return result.map(r => ({ ...r.projects, client: r.users || undefined }));
    }
    const result = await db
      .select()
      .from(projects)
      .leftJoin(users, eq(projects.clientId, users.id))
      .orderBy(desc(projects.createdAt));
    return result.map(r => ({ ...r.projects, client: r.users || undefined }));
  }

  async getProject(id: number): Promise<ProjectResponse | undefined> {
    const [result] = await db
      .select()
      .from(projects)
      .leftJoin(users, eq(projects.clientId, users.id))
      .where(eq(projects.id, id));
    if (!result) return undefined;
    return { ...result.projects, client: result.users || undefined };
  }

  async createProject(data: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(data).returning();
    return project;
  }

  async updateProject(id: number, data: UpdateProjectRequest): Promise<Project> {
    const [updated] = await db.update(projects).set(data).where(eq(projects.id, id)).returning();
    return updated;
  }

  async getDocuments(projectId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.projectId, projectId)).orderBy(desc(documents.createdAt));
  }

  async createDocument(data: InsertDocument): Promise<Document> {
    const [doc] = await db.insert(documents).values(data).returning();
    return doc;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async getEvents(projectId?: number): Promise<Event[]> {
    if (projectId) {
      return await db.select().from(events).where(eq(events.projectId, projectId)).orderBy(desc(events.date));
    }
    return await db.select().from(events).orderBy(desc(events.date));
  }

  async createEvent(data: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(data).returning();
    return event;
  }

  async updateEvent(id: number, data: UpdateEventRequest): Promise<Event> {
    const [updated] = await db.update(events).set(data).where(eq(events.id, id)).returning();
    return updated;
  }

  async deleteEvent(id: number): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  async getInspections(projectId: number): Promise<InspectionResponse[]> {
    const result = await db
      .select()
      .from(inspections)
      .leftJoin(users, eq(inspections.engineerId, users.id))
      .where(eq(inspections.projectId, projectId))
      .orderBy(desc(inspections.date));
    
    const inspectionResults: InspectionResponse[] = [];
    for (const r of result) {
      const inspDefects = await db.select().from(defects).where(eq(defects.inspectionId, r.inspections.id)).orderBy(desc(defects.dateFound));
      inspectionResults.push({
        ...r.inspections,
        engineer: r.users || undefined,
        defects: inspDefects,
      });
    }
    return inspectionResults;
  }

  async createInspection(data: InsertInspection): Promise<Inspection> {
    const [insp] = await db.insert(inspections).values(data).returning();
    return insp;
  }

  async updateInspection(id: number, data: UpdateInspectionRequest): Promise<Inspection> {
    const [updated] = await db.update(inspections).set(data).where(eq(inspections.id, id)).returning();
    return updated;
  }

  async getDefects(inspectionId: number): Promise<Defect[]> {
    return await db.select().from(defects).where(eq(defects.inspectionId, inspectionId)).orderBy(desc(defects.dateFound));
  }

  async createDefect(data: InsertDefect): Promise<Defect> {
    const [defect] = await db.insert(defects).values(data).returning();
    return defect;
  }

  async updateDefect(id: number, data: UpdateDefectRequest): Promise<Defect> {
    const [updated] = await db.update(defects).set(data).where(eq(defects.id, id)).returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
