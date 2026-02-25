# Bauwerksbuch-Archkorab Client Dashboard

## Overview
A construction project management platform providing a centralized hub for clients to view and manage their construction projects. Built for Archkorab GmbH with enterprise-grade dark theme.

## Architecture
- **Frontend**: React + Vite with Tailwind CSS, shadcn/ui components, wouter routing
- **Backend**: Express.js with Replit Auth (OIDC), Drizzle ORM
- **Database**: PostgreSQL (Neon-backed via Replit)
- **Auth**: Replit Auth integration (no custom login forms)

## Project Structure
```
shared/
  schema.ts        - Drizzle schema + Zod types for all entities
  routes.ts        - API contract with Zod validation schemas
  models/auth.ts   - Replit Auth user/session tables
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
- Replit Auth login (no signup forms)
- Role-based access: admin sees all + full management, other roles see only their assigned projects
- Three roles: Administrator, Hausverwaltung, Eigentümer
- Manual user creation via Benutzerverwaltung (admin only)
- Project listings with search/filter
- Project detail views with documents, events, inspections tabs
- Global calendar for inspections/deadlines
- Inspections directory linking to per-project logbooks
- Sample seed data for demo (Vienna construction projects)

## Database Tables
- users (from Replit Auth)
- sessions (from Replit Auth)
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
- 2026-02-25: Switched from dark mode to light mode matching bauwerksbuch-archkorab.at color theme (purple-blue primary, coral accent, light background, white cards)
- 2026-02-24: Redesigned "Prüfung hinzufügen" dialog with inspection type (Erstprüfung/Folgeprüfung), inline defect creation (Mangel-Nr, Datum, Beschreibung, Ort, Status), and Mangel status system (leichter/grober Mangel)
- 2026-02-24: Redesigned role system: replaced admin/engineer/client with admin/hausverwaltung/eigentuemer; admin-only management; added user creation dialog in Benutzerverwaltung
- 2026-02-24: Added "Digitaler Bauakt" tab to project details - Excel import, file upload/hosting, searchable table with Dateiname/Jahr/Beschreibung/Art/Anmerkung columns
- 2026-02-24: Added project edit function to Projektdetails page (admin only)
- 2026-02-24: Added Verwaltung (verwaltungId FK to users) and Eigentümer (free text) fields to projects; displayed in project details and creation form
- 2026-02-24: Translated entire app interface to German
- 2026-02-24: Added defects table with primary/follow-up structure; inspection logbook shows Defect ID, Date, Description, Location in table format
- 2026-02-24: Initial build - schema, backend, frontend, auth, seed data, role-based access
