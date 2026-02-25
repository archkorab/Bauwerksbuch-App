# Bauwerksbuch-Archkorab Client Dashboard

## Overview
A construction project management platform providing a centralized hub for clients to view and manage their construction projects. Built for Archkorab GmbH with light mode enterprise theme.

## Architecture
- **Frontend**: React + Vite with Tailwind CSS, shadcn/ui components, wouter routing
- **Backend**: Express.js with custom session-based auth (bcryptjs), Drizzle ORM
- **Database**: PostgreSQL (Neon-backed via Replit)
- **Auth**: Custom email/password auth with bcrypt hashing, session-based (express-session + connect-pg-simple)

## Project Structure
```
shared/
  schema.ts        - Drizzle schema + Zod types for all entities
  routes.ts        - API contract with Zod validation schemas
  models/auth.ts   - User/session tables (custom auth)
server/
  index.ts         - Express entry point
  db.ts            - Database connection (drizzle + pg)
  storage.ts       - Data access layer (IStorage interface)
  routes.ts        - API route handlers with auth + role checks
  replit_integrations/auth/ - Replit Auth setup
client/src/
  App.tsx           - Root router (auth-gated)
  pages/            - Landing, Dashboard, ProjectDetails, Calendar, InspectionsGlobal
  components/       - Layout (sidebar), MapPlaceholder
  hooks/            - Custom hooks for data fetching (use-auth, use-profile, use-projects, etc.)
  index.css         - Dark enterprise theme variables
```

## Key Features
- Custom email/password login + registration (bcryptjs hashing)
- Role-based access: admin sees all + full management, other roles see only their assigned projects
- Three roles: Administrator, Hausverwaltung, Eigentümer
- Manual user creation via Benutzerverwaltung (admin only, default password "changeme123")
- Project listings with search/filter
- Project detail views with documents, images gallery, events, inspections tabs
- Global calendar for inspections/deadlines
- Inspections directory linking to per-project logbooks
- Sample seed data for demo (Vienna construction projects)

## Database Tables
- users (custom auth with password hash)
- sessions (express-session + connect-pg-simple)
- profiles (role, phone, company)
- projects (name, address, coordinates, status, nextInspectionDue, verwaltungId, eigentuemer)
- documents (name, url, type, uploadedBy)
- events (title, date, type, projectId)
- inspections (date, status, type, notes, engineerId, projectId) - type: erstpruefung/folgepruefung
- defects (defectId, dateFound, description, location, status, parentDefectId, inspectionId) - defect findings per inspection, with follow-up support via parentDefectId
- bauakt (dateiname, jahr, beschreibung, art, anmerkung, fileUrl, projectId) - digital building records imported from Excel

## Inspection/Defect Model
- Each inspection has a type (erstpruefung/folgepruefung), date, engineer, status, and notes
- "Prüfung hinzufügen" dialog allows creating inspections with inline defect entries
- Defect fields: Mangel-Nr, Datum der Feststellung, Beschreibung, Ort, Status (leichter_mangel/grober_mangel), Frist (1_woche/2_wochen/1_monat/2_monate/6_monate), Reparatur bis (auto-calculated from dateFound + frist)
- Follow-up defects reference a parentDefectId to group them under the original finding
- API: GET /api/projects/:projectId/inspections returns inspections with nested defects[]
- API: POST /api/projects/:projectId/inspections creates inspection
- API: POST /api/inspections/:inspectionId/defects creates defect for an inspection
- Defect summary: GET /api/defects/summary returns per-project Mangel status (kein/leichter/grober)

## User Preferences
- Light mode theme matching bauwerksbuch-archkorab.at
- Outfit + Plus Jakarta Sans fonts
- Purple-blue primary (#6262a0), coral accent (#d1645d)
- Light background (#fafaff), clean white cards
- Minimal, professional design

## Project Model - Verwaltung & Eigentümer
- verwaltungId: FK to users table (client type) - the building management company
- eigentuemer: free text field - the building owner (doesn't have to be a registered user)
- Both shown in project details sidebar and available in project creation form
- Verwaltung displays user name + company from profile

## Recent Changes
- 2026-02-25: Replaced Replit Auth with custom email/password auth — registration, login, bcrypt hashing, session-based; landing page with login/register form; admin user creation sets default password "changeme123"
- 2026-02-25: Added "Bilder" tab to project details — image gallery with upload (multi-file), download, delete; stored in uploads/project-images/
- 2026-02-25: Added image upload for defect entries — upload during create/edit, displayed as thumbnails in defect tables (project details + global inspections), stored in uploads/defect-images/
- 2026-02-25: Switched from dark mode to light mode matching bauwerksbuch-archkorab.at color theme (purple-blue primary, coral accent, light background, white cards)
- 2026-02-24: Redesigned "Prüfung hinzufügen" dialog with inspection type (Erstprüfung/Folgeprüfung), inline defect creation (Mangel-Nr, Datum, Beschreibung, Ort, Status), and Mangel status system (leichter/grober Mangel)
- 2026-02-24: Redesigned role system: replaced admin/engineer/client with admin/hausverwaltung/eigentuemer; admin-only management; added user creation dialog in Benutzerverwaltung
- 2026-02-24: Added "Digitaler Bauakt" tab to project details - Excel import, file upload/hosting, searchable table with Dateiname/Jahr/Beschreibung/Art/Anmerkung columns
- 2026-02-24: Added project edit function to Projektdetails page (admin only)
- 2026-02-24: Added Verwaltung (verwaltungId FK to users) and Eigentümer (free text) fields to projects; displayed in project details and creation form
- 2026-02-24: Translated entire app interface to German
- 2026-02-24: Added defects table with primary/follow-up structure; inspection logbook shows Defect ID, Date, Description, Location in table format
- 2026-02-24: Initial build - schema, backend, frontend, auth, seed data, role-based access
