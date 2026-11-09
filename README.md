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
- Add, edit and remove relatives
- Connect children to parents across multiple generations
- Record birth/death dates, spouse or partner, and notes
- Load an example family to explore the visualization
- Responsive family tree with an overflow-friendly canvas
- Each account only sees its own tree

## Project structure

```text
backend/
  api/               Vercel serverless entry points
  database/          Cached MongoDB connection
  middleware/        JWT authentication
  models/            User and Person schemas
  routes/            Auth and people endpoints
  app.js             Express application
  server.js          Local server
frontend/
  public/
  src/components/    Login, tree, and person form
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
| `GET` | `/api/people` | List the signed-in user's people |
| `POST` | `/api/people` | Add a person |
| `POST` | `/api/people/demo` | Replace the tree with example data |
| `PUT` | `/api/people/:id` | Update a person |
| `DELETE` | `/api/people/:id` | Delete a person and descendants |

Authenticated requests use `Authorization: Bearer <token>`.

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
