# Free Deployment Guide

This guide explains how to deploy the HRM Portal completely for **free** using **Neon** (Database) and **Render** (Application Hosting).

## Prerequisites
- A GitHub account (to host your code).
- A [Neon.tech](https://neon.tech) account (Free PostgreSQL).
- A [Render.com](https://render.com) account (Free Web Service).

---

## Step 1: Push Code to GitHub
1. Initialize git in your project folder if you haven't:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
2. Create a new repository on GitHub.
3. Push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin master
   ```

---

## Step 2: Set up Free Database (Neon)
1. Log in to [Neon Console](https://console.neon.tech).
2. Create a new **Project**.
3. Copy the **Connection String** (e.g., `postgres://alex:AbC123@ep-cool-frog.aws.neon.tech/neondb?sslmode=require`).
4. **Restore your data (Optional):**
   - I have created a backup file at `server/backup.sql`.
   - You can use a tool like **pgAdmin** or **DBeaver** to connect to your Neon DB using the connection string.
   - Run the SQL queries from `server/backup.sql` to import your sample data.

---

## Step 3: Deploy App to Render
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.
4. Configure the service:
   - **Name:** `hrm-portal` (or any name)
   - **Region:** Closest to you (e.g., Singapore, Frankfurt, Oregon)
   - **Branch:** `master` (or `main`)
   - **Runtime:** `Node`
   - **Root Directory:** *(leave blank)*
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`

5. **Environment Variables** (Click "Advanced" or go to Environment tab):
   Add the following keys:

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | Your Neon connection string from Step 2 |
   | `JWT_SECRET` | A random secret key, e.g. `my-super-secret-key-123` |
   | `NODE_ENV` | `production` |
   | `CLIENT_URL` | Your Render app URL, e.g. `https://hrm-portal.onrender.com` |

   > **Note:** You will get your `CLIENT_URL` after the first deploy. You can add/update this env var after the initial deploy — just trigger a redeploy after setting it.

6. Click **Create Web Service**.

---

## Step 4: Verification
- Render will start building your app. It might take a few minutes.
- Once finished, it will provide a URL (e.g., `https://hrm-portal.onrender.com`).
- Go to the **Environment** tab and set `CLIENT_URL` to that URL if you haven't already, then trigger a manual redeploy.
- Open the URL. You should see your live application!

---

## How It Works
- **Build step:** `npm run build` installs all dependencies (root, client, server) and runs `vite build` to create the production client bundle in `client/dist/`.
- **Start step:** `npm start` runs the Express server, which serves the built client files and exposes the API on the same port.
- Since the client and server share the same origin, API calls use relative URLs (`/api/...`) and no CORS issues arise.
