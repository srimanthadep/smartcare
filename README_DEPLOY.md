# Deploying Siara Dental to Render

This project is configured for a seamless deployment on [Render](https://render.com).

## 1. Prerequisites
- A GitHub or GitLab repository with your code.
- A [Render](https://render.com) account.
- Your Supabase `DATABASE_URL` (using the Session Pooler).

## 2. One-Click Deployment (Blueprints)
1. Push your code to your GitHub repository.
2. Log in to Render.
3. Click **New +** and select **Blueprint**.
4. Connect your repository.
5. Render will automatically detect the `render.yaml` file and set up:
   - **siara-dental-backend** (Web Service)
   - **siara-dental-frontend** (Static Site)

## 3. Environment Variables
After the blueprint starts, you MUST manually set the following secret keys in the Render Dashboard for the **backend** service:
- `MISTRAL_API_KEY`: `auXFbIRPeEgvOeXdC63QZHQYgm4RPcCE`
- `RESEND_API_KEY`: `re_...` (your resend key)
- `DATABASE_URL`: Your Supabase connection string.
- `CORS_ORIGINS`: Set this to your frontend URL (e.g., `https://siara-dental.onrender.com`).

## 4. Troubleshooting
- **CORS Errors**: Ensure the `CORS_ORIGINS` in your Render Backend settings exactly matches your Frontend URL.
- **AI Failures**: Ensure `MISTRAL_API_KEY` is correctly set in the environment.
- **Frontend Connectivity**: The `VITE_API_BASE_URL` is automatically linked via the Blueprint, but you can manually override it if needed.

---
**Note**: The first deployment might take 3-5 minutes as Render builds the frontend and installs dependencies.
