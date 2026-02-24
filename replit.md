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
- Role-based access: admin/engineer see all, clients see only their projects
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
- inspections (date, status, notes, engineerId, projectId) - primary inspections
- defects (defectId, dateFound, description, location, status, parentDefectId, inspectionId) - defect findings per inspection, with follow-up support via parentDefectId

## Inspection/Defect Model
- Each inspection is a "primary inspection" with a date, engineer, status, and notes
- Defects are linked to an inspection and display: Defect ID, Date of Finding, Description, Location, Status
- Follow-up defects reference a parentDefectId to group them under the original finding
- API: GET /api/projects/:projectId/inspections returns inspections with nested defects[]
- API: POST/GET /api/inspections/:inspectionId/defects for managing defects

## User Preferences
- Professional dark mode enterprise theme
- Outfit + Plus Jakarta Sans fonts
- Blue primary accent color
- Minimal, clean design

## Project Model - Verwaltung & Eigentümer
- verwaltungId: FK to users table (client type) - the building management company
- eigentuemer: free text field - the building owner (doesn't have to be a registered user)
- Both shown in project details sidebar and available in project creation form
- Verwaltung displays user name + company from profile

## Recent Changes
- 2026-02-24: Added Verwaltung (verwaltungId FK to users) and Eigentümer (free text) fields to projects; displayed in project details and creation form
- 2026-02-24: Translated entire app interface to German
- 2026-02-24: Added defects table with primary/follow-up structure; inspection logbook shows Defect ID, Date, Description, Location in table format
- 2026-02-24: Initial build - schema, backend, frontend, auth, seed data, role-based access
