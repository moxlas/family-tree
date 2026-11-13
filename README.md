# Family Tree

A private family tree app for recording people, connecting generations, and
preserving the details that make a family story.

## Live app

- **Frontend (GitHub Pages):** https://moxlas.github.io/family-tree/
- **API (Vercel):** https://backend-kappa-wine-51.vercel.app
- **Repository:** https://github.com/moxlas/family-tree

## What you can do

- Create a private account and keep your own trees
- Build and edit people, parents, children, spouses, and former spouses
- Switch between a bloodline-only view and a view that shows spouse cards
- Focus on any person's branch to explore ancestors, descendants, and relatives
- Collapse or expand a person's children directly on their card
- Record birth and death dates and places, gender, and notes
- View relationship summaries (parents, siblings, grandparents, aunts/uncles,
  cousins, in-laws, step-relations, former spouses)
- Create and switch between multiple family trees
- Import and export GEDCOM 5.5.1 files
- Share a read-only link to a tree with visitors
- Use the app in English or Lithuanian

## Using the app

1. Register or sign in.
2. Create a family tree (or load the example family to explore).
3. Add people and connect them as parents, children, or spouses.
4. Choose a home person; the tree is centred on them.
5. Use the view toggle to show or hide spouse cards.
6. Open a person's card for details, or edit them from the person form.
7. Export your tree as GEDCOM, or share a read-only link from Settings.

Shared trees are read-only for visitors and can be turned on or off at any
time. A new link can be generated if an old one should stop working.

## Stack

- React 18 (Create React App)
- Node.js + Express
- MongoDB Atlas with Mongoose
- JWT authentication
- GitHub Pages for the frontend
- Vercel serverless functions for the API

## Project structure

```text
backend/
  api/               Vercel serverless entry points
  database/          Cached MongoDB connection
  middleware/        JWT authentication
  models/            User, Person, Tree and Family schemas
  routes/            Auth, people, trees, families and public endpoints
  services/          GEDCOM import service
  utils/             Shared helpers
  app.js             Express application
  server.js          Local server
frontend/
  public/            Static assets and favicon set
  src/components/    Login, tree, person form, details, sharing and modals
  src/gedcom.js      GEDCOM 5.5.1 parser and exporter
  src/i18n.js        English and Lithuanian strings
  src/share.js       Share link helpers
  src/api.js         Axios client and token handling
  scripts/           Asset generation scripts
```

## Local development

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure the backend

Copy `backend/.env.example` to `backend/.env` and add your MongoDB Atlas URI:

```env
PORT=5000
MONGO_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/familytree?retryWrites=true&w=majority
JWT_SECRET=replace-with-a-long-random-string
CORS_ORIGIN=http://localhost:3000,https://moxlas.github.io
```

### 3. Run the app

In one terminal:

```bash
npm run start:backend
```

In another terminal:

```bash
npm run start:frontend
```

The frontend opens at `http://localhost:3000` and uses the API at
`http://localhost:5000`.

## API

A compact overview of the main endpoints (additional endpoints are available):

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | API and database health |
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/login` | Sign in |
| `GET` | `/api/auth/me` | Current user |
| `PUT` | `/api/auth/profile` | Update name and email |
| `PUT` | `/api/auth/settings` | Update display preferences |
| `GET` | `/api/people` | List people in a tree (`?treeId=`) |
| `POST` | `/api/people` | Add a person |
| `PUT` | `/api/people/:id` | Update a person |
| `DELETE` | `/api/people/:id` | Delete a person |
| `GET` | `/api/trees` | List the signed-in user's trees |
| `POST` | `/api/trees` | Create a tree |
| `PUT` | `/api/trees/:id` | Rename a tree or set its home person |
| `DELETE` | `/api/trees/:id` | Delete a tree |
| `POST` | `/api/trees/:id/import` | Merge a GEDCOM file into a tree |

Authenticated requests use `Authorization: Bearer <token>`.

## GEDCOM notes

- Only GEDCOM 5.5.1 is supported.
- Import merges into the selected tree. Existing people are matched by name and
  birth year; missing details are filled in.
- The app supports two parents per person and multiple spouses, recorded as
  families.
- Maiden and previous names are stored as surnames and round-trip through
  GEDCOM.
- Up to 3,000 people can be imported in one file.

## Deployment

### Backend — Vercel

1. Set the Vercel project root directory to `backend`.
2. Add `MONGO_URI`, `JWT_SECRET`, and `CORS_ORIGIN` to the project's
   Production environment variables.
3. Deploy with the Vercel CLI or connect the GitHub repository.

```bash
cd backend
vercel --prod
```

### Frontend — GitHub Pages

Create `frontend/.env.production` with the deployed API URL:

```env
REACT_APP_API_URL=https://backend-kappa-wine-51.vercel.app
```

Then deploy:

```bash
cd frontend
npm run deploy
```

The `predeploy` script builds the app and `gh-pages` publishes the `build`
folder to the `gh-pages` branch. Set GitHub Pages to serve from that branch.
```