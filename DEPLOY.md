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
   - **Branch:** `master` (or main)
   - **Runtime:** `Node`
   - **Build Command:** `npm run install-all && npm run build`
     *(This installs dependencies for both client/server and builds the React app)*
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`

5. **Environment Variables** (Click "Advanced"):
   Add the following keys:
   - `DATABASE_URL`: (Paste your Neon Connection String from Step 2)
   - `JWT_SECRET`: (Enter a random secret key, e.g., `my-super-secret-key-123`)
   - `NODE_ENV`: `production`

6. Click **Create Web Service**.

---

## Step 4: Verification
- Render will start building your app. It might take a few minutes.
- Once finished, it will provide a URL (e.g., `https://hrm-portal.onrender.com`).
- Open the URL. You should see your live application!
