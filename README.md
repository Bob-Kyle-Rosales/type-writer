# Typewriter

A minimal typewriter-style document editor with a React client and Express + SQLite server.

**Features**

- Create, update, delete, and list documents
- Simple JWT-based auth (register/login)
- SQLite persistence (documents.db in `server/`)

**Tech stack**

- Client: React (Create React App)
- Server: Node.js + Express
- Database: SQLite

**Quick setup (local)**

1. Install dependencies:

```bash
npm run install-all
```

2. Run both services in development:

```bash
npm run dev
```

- Client dev server runs on http://localhost:3000 and proxies `/api` to http://localhost:3001 (see `client/package.json` `proxy`).
- Server runs on http://localhost:3001 and stores `documents.db` in the `server/` folder.

**Environment variables**

- Client: create `client/.env` or set in Vercel
  - `REACT_APP_API_URL` — full URL of the deployed server (e.g. `https://my-service.onrender.com`). If empty, client will use relative `/api` paths (useful for local proxy).
- Server:
  - `PORT` — optional, default 3001
  - `JWT_SECRET` — set a strong secret for token generation (important in production)

A sample client example is provided at `client/.env.example`.

**Deployment**

- Client: deploy to Vercel. The repository includes `vercel.json` configured to build the `client` folder. Set the `REACT_APP_API_URL` environment variable in the Vercel project to your server URL.
- Server: deploy to Render (or similar). A sample `render.yaml` is included. Ensure persistent storage or a managed DB if you need data durability across deploys.

See `DEPLOY.md` for a concise step-by-step deployment guide.

**Serve client from server (optional single deploy)**
If you prefer one deployable app, you can build the client and serve the static `client/build` from Express. Steps:

```bash
cd client
npm run build
# copy or serve client/build from server static middleware
```

If you want, I can add an Express route to serve the built client and update the server build scripts.

**Notes & caveats**

- SQLite `documents.db` is stored in `server/` and may be lost on ephemeral hosts; configure persistent disks or a managed DB for production.
- Make sure to set `JWT_SECRET` in production and do not commit secrets.

**Useful commands**

- Install: `npm run install-all`
- Dev: `npm run dev`
- Build client: `npm run build`
- Start server only: `cd server && npm start`

If you want, I can also:

- Add server static serving for the built client (single Render deploy).
- Add scripts to automate client build during server deploy.
