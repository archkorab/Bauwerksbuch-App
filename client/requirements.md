## Packages
date-fns | Formatting and manipulating dates
recharts | Beautiful data visualization for the dashboard
react-hook-form | Form state management
@hookform/resolvers | Zod validation resolver for forms
clsx | Class name merging
tailwind-merge | Tailwind class merging

## Notes
- The application uses Replit Auth for authentication. Links to `/api/login` and `/api/logout` handle the flows.
- Map view is implemented using a custom SVG placeholder to maintain high visual fidelity without leaflet CSS overhead.
- Dark mode enterprise theme is enforced natively via `index.css`.
- API endpoints are heavily relational; we use local form schemas to ensure proper coercion of strings/numbers before submitting.
