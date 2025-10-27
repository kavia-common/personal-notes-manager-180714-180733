# Notes Frontend (Ocean Professional)

A modern, lightweight React notes app where users can create, view, edit, and delete personal notes.

## Features

- CRUD notes with localStorage persistence
- Auto-detects backend API at `/api` (via `/api/health`) and uses it if available
- Ocean Professional theme: primary #2563EB, secondary/success #F59E0B, error #EF4444
- Responsive grid of note cards with subtle gradients and rounded corners
- Modal dialogs for create/edit and confirm delete
- Simple search filter
- Minimal dependencies (pure React + CSS)

## Getting Started

- `npm start` — Start development server at http://localhost:3000
- `npm test` — Run test watcher
- `npm run build` — Build for production

## Configuration

- Optional: `REACT_APP_API_BASE` — Set API base URL if different from `/api`
  - See `.env.example`

If no API is reachable, the app falls back to localStorage automatically.

## Structure

- `src/services/notesService.js` — API/localStorage abstraction
- `src/pages/NotesPage.jsx` — Main page with grid and modals
- `src/components/*` — UI components
- `src/theme.css` — Ocean Professional theme styles
