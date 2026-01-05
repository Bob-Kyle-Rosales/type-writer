Deployment instructions

1. Vercel (Client)

- In Vercel, create a new project and link your repository.
- In project settings set the Root Directory to `client` (or use the included vercel.json which targets `client/package.json`).
- Add an environment variable `REACT_APP_API_URL` with value set to your Render server URL (e.g. `https://your-service.onrender.com`).
- Vercel will run `npm install` and `npm run build` in `client` and publish the static site.

2. Render (Server)

- Create a new Web Service on Render.
- Use the repository and set the root to the repository root.
- Set the build command to: `cd server && npm install`
- Set the start command to: `cd server && npm start`
- Add any required environment variables (e.g., `NODE_ENV=production`).
- If you prefer, use the provided `render.yaml` (replace `repo` value) and import it to Render.

3. Environment variables & API URL

- After deploying the server, copy its public URL (e.g. `https://your-service.onrender.com`).
- Set `REACT_APP_API_URL` in the Vercel project to that URL.
- The client reads `REACT_APP_API_URL` at runtime and prefixes all API requests.

4. Local testing

- Install dependencies and run both services locally:

```bash
npm run install-all
npm run dev
```

- Locally CRA dev server proxies `/api` to `http://localhost:3001` (see client/package.json `proxy`).

5. Notes

- The server uses SQLite and stores `documents.db` in the `server/` folder; ensure persistent storage is configured if using ephemeral instances.
- If you want to serve both client and server from Render, you can build the client during the server build and serve static files from Express; reach out if you want that setup.
