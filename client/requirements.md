## Packages
date-fns | Required for human-readable date formatting across the dashboard
recharts | For basic project analytics and charts
lucide-react | Used extensively for iconography

## Notes
- Using Replit Auth; user is fetched from `/api/auth/user`.
- No custom login forms generated; utilizing `/api/login` route.
- Project IDs are numbers, User IDs are strings. Zod coerce used accordingly.
- Dark mode enterprise theme applied by default via CSS.
- Map view is implemented as a stylized conceptual placeholder with coordinates support.
