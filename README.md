# SmartDental

SmartDental is a modern dental clinic management system split into two folders:

- `frontend/` for the Vite + React application
- `backend/` for the Node API

## Frontend

Location: `frontend/`

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test`

Set `frontend/.env` from `frontend/.env.example` when you need a custom API base URL.

## Backend

Location: `backend/`

- `npm run dev`
- `npm run start`

Set `backend/.env` from `backend/.env.example` when you need custom ports, CORS, or auth secrets.

The backend keeps its seeded JSON data in `backend/data/db.json`.
