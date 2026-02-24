import { sql } from "drizzle-orm";
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export * from "./models/auth";

// --- Enums ---
export const roleEnum = z.enum(["admin", "hausverwaltung", "eigentuemer", "auftraggeber"]);
export const inspectionStatusEnum = z.enum(["OK", "needs_repair", "urgent"]);
export const inspectionTypeEnum = z.enum(["erstpruefung", "folgepruefung"]);
export const projectStatusEnum = z.enum(["active", "completed", "archived"]);

// --- Table Definitions ---
export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id),
  role: text("role").notNull().default("auftraggeber"),
  phone: text("phone"),
  company: text("company"),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull().references(() => users.id),
  verwaltungId: text("verwaltung_id").references(() => users.id),
  eigentuemer: text("eigentuemer"),
  name: text("name").notNull(),
  address: text("address").notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  status: text("status", { enum: ["active", "completed", "archived"] }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  nextInspectionDue: timestamp("next_inspection_due"),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull(), // pdf, image, etc.
  uploadedBy: text("uploaded_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  type: text("type").notNull(), // inspection, deadline, visit
});

export const inspections = pgTable("inspections", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  engineerId: text("engineer_id").notNull().references(() => users.id),
  date: timestamp("date").notNull(),
  status: text("status", { enum: ["OK", "needs_repair", "urgent"] }).notNull(),
  type: text("type", { enum: ["erstpruefung", "folgepruefung"] }).notNull().default("erstpruefung"),
  notes: text("notes"),
  reportUrl: text("report_url"),
});

export const defects = pgTable("defects", {
  id: serial("id").primaryKey(),
  inspectionId: integer("inspection_id").notNull().references(() => inspections.id),
  defectId: text("defect_id").notNull(),
  bauteil: text("bauteil").array(),
  dateFound: timestamp("date_found").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  status: text("status", { enum: ["leichter_mangel", "grober_mangel"] }).notNull().default("leichter_mangel"),
  frist: text("frist", { enum: ["1_woche", "2_wochen", "1_monat", "2_monate", "6_monate"] }),
  repairDue: timestamp("repair_due"),
  parentDefectId: integer("parent_defect_id"),
});

export const bauakt = pgTable("bauakt", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  dateiname: text("dateiname").notNull(),
  jahr: text("jahr"),
  beschreibung: text("beschreibung"),
  art: text("art"),
  anmerkung: text("anmerkung"),
  fileUrl: text("file_url"),
});

// --- Relations ---
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  clientProjects: many(projects, { relationName: "client_projects" }),
  verwaltungProjects: many(projects, { relationName: "verwaltung_projects" }),
  engineerInspections: many(inspections, { relationName: "engineer_inspections" }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(users, {
    fields: [projects.clientId],
    references: [users.id],
    relationName: "client_projects",
  }),
  verwaltung: one(users, {
    fields: [projects.verwaltungId],
    references: [users.id],
    relationName: "verwaltung_projects",
  }),
  documents: many(documents),
  events: many(events),
  inspections: many(inspections),
  bauakte: many(bauakt),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  project: one(projects, {
    fields: [events.projectId],
    references: [projects.id],
  }),
}));

export const inspectionsRelations = relations(inspections, ({ one, many }) => ({
  project: one(projects, {
    fields: [inspections.projectId],
    references: [projects.id],
  }),
  engineer: one(users, {
    fields: [inspections.engineerId],
    references: [users.id],
    relationName: "engineer_inspections",
  }),
  defects: many(defects),
}));

export const defectsRelations = relations(defects, ({ one }) => ({
  inspection: one(inspections, {
    fields: [defects.inspectionId],
    references: [inspections.id],
  }),
  parentDefect: one(defects, {
    fields: [defects.parentDefectId],
    references: [defects.id],
    relationName: "defect_followups",
  }),
}));

export const bauaktRelations = relations(bauakt, ({ one }) => ({
  project: one(projects, {
    fields: [bauakt.projectId],
    references: [projects.id],
  }),
}));

// --- Base Schemas ---
export const insertProfileSchema = createInsertSchema(profiles).omit({ id: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true });
export const insertInspectionSchema = createInsertSchema(inspections).omit({ id: true });
export const insertDefectSchema = createInsertSchema(defects).omit({ id: true });
export const insertBauaktSchema = createInsertSchema(bauakt).omit({ id: true });

// --- Explicit API Contract Types ---

// Profiles
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type UpdateProfileRequest = Partial<InsertProfile>;

// Projects
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type CreateProjectRequest = InsertProject;
export type UpdateProjectRequest = Partial<InsertProject>;
export type ProjectResponse = Project & { client?: typeof users.$inferSelect & { profile?: Profile }, verwaltung?: typeof users.$inferSelect & { profile?: Profile } };
export type ProjectsListResponse = ProjectResponse[];

// Documents
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type CreateDocumentRequest = InsertDocument;
export type DocumentResponse = Document;

// Events
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type CreateEventRequest = InsertEvent;
export type UpdateEventRequest = Partial<InsertEvent>;
export type EventResponse = Event;

// Inspections
export type Inspection = typeof inspections.$inferSelect;
export type InsertInspection = z.infer<typeof insertInspectionSchema>;
export type CreateInspectionRequest = InsertInspection;
export type UpdateInspectionRequest = Partial<InsertInspection>;
export type InspectionResponse = Inspection & { engineer?: typeof users.$inferSelect & { profile?: Profile }, defects?: Defect[] };

// Defects
export type Defect = typeof defects.$inferSelect;
export type InsertDefect = z.infer<typeof insertDefectSchema>;
export type CreateDefectRequest = InsertDefect;
export type UpdateDefectRequest = Partial<InsertDefect>;

// Bauakt
export type Bauakt = typeof bauakt.$inferSelect;
export type InsertBauakt = z.infer<typeof insertBauaktSchema>;

