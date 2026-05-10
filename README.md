# Memory Palace

> Turn your course notes into an interactive knowledge graph — powered by Google Gemini AI.

Memory Palace takes any educational material (plain text or PDF) and transforms it into a navigable visual graph of concepts, units, and their relationships. Built as a hackathon project for GDG 2026.

---

## Table of Contents

- [Demo](#demo)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Known Limitations](#known-limitations)

---

## Demo

**Frontend (GitHub Pages):** https://ahmedbhy1.github.io/GDG26/

**Backend (Render):** https://gdg26.onrender.com

---

## Features

- **AI-Powered Graph Generation** — Paste notes or upload a PDF; Gemini 2.5 Flash parses the content and returns a structured JSON knowledge graph with nodes, connections, and importance scores.
- **Interactive SVG Graph Explorer** — Zoom between a root subject node, unit nodes, and concept nodes. Nodes use physics-based magnetic hover effects and glassmorphism styling.
- **Dual Input Modes** — Supports raw text input and PDF file upload (drag-and-drop or file picker, up to 20 MB).
- **Persistent Storage** — Every generated graph is saved to MongoDB for future retrieval.
- **Smooth Animations** — GSAP-driven entrance animations, letter-by-letter title reveals, and Lenis smooth scrolling.
- **Dark Gradient UI** — Animated gradient background, glassmorphic panels, and responsive layout.

---

## Tech Stack

### Frontend
| Library | Version | Purpose |
|---|---|---|
| React | 19 | UI framework |
| Vite | 8 | Build tool & dev server |
| React Router | 7 | Client-side routing |
| GSAP | 3 | Animations & magnetic effects |
| Lenis | 1 | Smooth scroll |

### Backend
| Library | Version | Purpose |
|---|---|---|
| Node.js / Express | 4 | HTTP server |
| `@google/generative-ai` | 0.24 | Gemini API client |
| Mongoose | 8 | MongoDB ODM |
| Multer | 2 | PDF upload handling |
| pdf-parse | 2 | PDF text extraction |
| Zod | 3 | Runtime schema validation |

---

## Architecture

```
User
 │
 ▼
React Frontend (GitHub Pages)
 │  POST /generate  { notes: string }
 │  POST /upload    multipart/form-data (PDF)
 ▼
Express Backend (Render)
 │
 ├─► Google Gemini 2.5 Flash
 │     └─ Returns raw JSON knowledge graph
 │
 ├─► Zod validation (graph schema)
 │
 └─► MongoDB Atlas
       └─ Persists graph + raw response
```

**Graph schema — every node has:**
- `id` — unique string identifier
- `title` — short concept name
- `content` — 3–6 sentence explanation (deep, study-worthy)
- `connected` — array of related node IDs
- `importance` — integer 1–5 (5 = root, 4 = unit, 3–1 = concept depth)

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- A MongoDB Atlas cluster (or local MongoDB)
- A Google Gemini API key ([get one here](https://aistudio.google.com/app/apikey))

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/memory-palace
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash   # optional, this is the default
PORT=4000                        # optional, defaults to 4000
```

```bash
npm run dev   # development (nodemon)
npm start     # production
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:

```env
VITE_BACKEND_URL=http://localhost:4000
```

```bash
npm run dev      # dev server at http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview production build locally
```

---

## Environment Variables

| Variable | Location | Required | Description |
|---|---|---|---|
| `MONGODB_URI` | backend/.env | Yes | MongoDB connection string |
| `GEMINI_API_KEY` | backend/.env | Yes | Google Gemini API key |
| `GEMINI_MODEL` | backend/.env | No | Gemini model name (default: `gemini-2.5-flash`) |
| `PORT` | backend/.env | No | Server port (default: `4000`) |
| `VITE_BACKEND_URL` | frontend/.env | No | Backend base URL (default: `https://gdg26.onrender.com`) |

---

## Project Structure

```
GDG26/
├── backend/
│   ├── index.js          # Single-file Express server (hackathon-friendly)
│   └── package.json
└── frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx               # Root — routing, Lenis init, backend wake-up
        ├── components/
        │   ├── TextInput.jsx     # Text/PDF input form with GSAP animations
        │   ├── GraphExplorer.jsx # Interactive SVG knowledge graph
        │   ├── NodeGraph.jsx     # SVG node rendering
        │   ├── Navbar.jsx        # Top navigation
        │   └── GradientBackground.jsx
        ├── pages/
        │   ├── About.jsx
        │   ├── ConceptPage.jsx   # Detailed concept drill-down view
        │   └── UnitPage.jsx
        ├── hooks/
        │   ├── useMagneticButton.js  # Magnetic hover physics
        │   └── useTheme.js
        └── data/
            └── courseData.js     # Graph normalisation utilities
```

---

## API Reference

### `GET /health`
Returns `{ ok: true }`. Used by the frontend to wake the Render instance on page load.

### `POST /generate`
**Body:** `application/json`
```json
{ "notes": "Your raw study notes as a string..." }
```
**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "<mongo_id>",
    "model": "gemini-2.5-flash",
    "createdAt": "2026-05-10T...",
    "graph": { "nodes": [ ... ] }
  }
}
```
**Response `400`:** `notes` field missing or not a string.  
**Response `500`:** Gemini API error, validation failure, or DB error.

---

## Deployment

### Frontend → GitHub Pages

The `vite.config.js` sets `base: '/GDG26/'` for correct asset paths.

```bash
cd frontend
npm run deploy   # builds then pushes dist/ to gh-pages branch
```

### Backend → Render

1. Connect the repo to Render as a **Web Service**.
2. Set **Root Directory** to `backend`.
3. **Build command:** `npm install`
4. **Start command:** `npm start`
5. Add all backend environment variables in the Render dashboard.

> **Cold starts:** Render's free tier spins down after inactivity. The frontend sends a `/health` ping on page load to wake the instance.

---

## Known Limitations

- **Cold start latency** — The Render free tier may take 30–60 seconds to wake up after inactivity.
- **Gemini rate limits** — Free-tier Gemini keys have per-minute and per-day request limits; large PDFs or rapid submissions may hit these.
- **PDF extraction** — `pdf-parse` cannot extract text from scanned/image-only PDFs. The document must contain selectable text.
- **Graph size** — Very large documents produce large graphs that may be slow to render in the SVG explorer.
