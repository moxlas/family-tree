# Family Tree

A private family tree app for recording people, connecting generations, and
preserving the details that make a family story.

## Live app

- **Frontend (GitHub Pages):** https://moxlas.github.io/family-tree/
- **API (Vercel):** https://backend-kappa-wine-51.vercel.app
- **Repository:** https://github.com/moxlas/family-tree

## Stack

- React 18 (Create React App)
- Node.js + Express 5
- MongoDB Atlas with Mongoose
- JWT authentication
- GitHub Pages for the frontend
- Vercel serverless functions for the API

## Features

- Register and sign in with a private account
- Profile settings for name, email, and tree display preferences
- Add, edit and remove relatives
- Connect children to parents across multiple generations
- Link spouses as people in the tree; each spouse can have their own parents
  and children
- Choose a bloodline-only view (spouses shown inline) or separate spouse cards
  (the default)
- Record birth/death dates, spouse or partner, and notes
- Load an example family to explore the visualization
- Responsive family tree with an overflow-friendly canvas
- English and Lithuanian interface with a language switcher
- Each account only sees its own tree
- Create and switch between multiple family trees per account
- Import GEDCOM 5.5.1 files with merge matching and a warning report
- Export the current tree as a GEDCOM 5.5.1 file
## Project structure

```text
backend/
  api/               Vercel serverless entry points
  database/          Cached MongoDB connection
  middleware/        JWT authentication
  models/            User, Person and Tree schemas
  routes/            Auth, people and tree endpoints
  services/          GEDCOM import service
  utils/             Shared helpers
  app.js             Express application
  server.js          Local server
frontend/
  public/
  src/components/    Login, tree, person form, trees and GEDCOM modals
  src/gedcom.js      GEDCOM 5.5.1 parser and exporter
  src/api.js         Axios client and token handling
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

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | API and database health |
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/login` | Sign in |
| `GET` | `/api/auth/me` | Current user |
| `PUT` | `/api/auth/profile` | Update the current user's name and email |
| `PUT` | `/api/auth/settings` | Update tree display preferences |
| `GET` | `/api/people` | List people in a tree (`?treeId=`) |
| `POST` | `/api/people` | Add a person to a tree |
| `POST` | `/api/people/demo` | Replace a tree with example data |
| `PUT` | `/api/people/:id` | Update a person |
| `DELETE` | `/api/people/:id` | Delete a person and descendants |
| `GET` | `/api/trees` | List the signed-in user's trees |
| `POST` | `/api/trees` | Create a tree |
| `PUT` | `/api/trees/:id` | Rename a tree |
| `DELETE` | `/api/trees/:id` | Delete a tree and its people |
| `POST` | `/api/trees/:id/import` | Merge a GEDCOM 5.5.1 file into a tree |

Authenticated requests use `Authorization: Bearer <token>`.

## GEDCOM notes

- Only GEDCOM 5.5.1 is supported. GEDCOM 7.0 may be added later.
- Import merges into the selected tree. Existing people are matched by name and
  birth year; missing details are filled in.
- This app stores one parent and one spouse per person, so GEDCOM families with
  two parents produce a warning and children are linked to the first parent.
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
