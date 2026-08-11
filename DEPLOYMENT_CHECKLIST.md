# Deployment Checklist

## Render deployment

The project includes `render.yaml` for a single Node web service. The API
serves the prepared frontend bundle and `/api/ping` is the health check.

1. Push the project to GitHub and create a Render Blueprint from `render.yaml`.
2. Create a managed MySQL database with Aiven, PlanetScale, Railway, or
   another MySQL provider; Render does not provide native managed MySQL.
3. Set the database variables, `JWT_SECRET`, and `CORS_ORIGIN` in Render.
4. Apply `database/schema.sql` and all migrations once to the production DB.
5. Verify `https://<service>.onrender.com/api/ping` after deployment.

Render's local filesystem is ephemeral. Move production videos and documents
to object storage before enabling uploads.

## 1. Choose a hosting platform
- Netlify or Vercel for a simple static site
- GitHub Pages for a free and easy option
- VPS or shared hosting for more control

## 2. Prepare the project
- Confirm the website files are in the correct folder
- Make sure HTML, CSS, and image paths are correct
- Keep the project structure simple and organized

## 3. Add essential website metadata
- Add a clear page title
- Add a meta description
- Add a favicon if available
- Add Open Graph tags for social sharing

## 4. Optimize the site
- Compress images
- Use efficient file sizes
- Remove unused files and scripts
- Ensure the site is mobile-friendly

## 5. Enable security
- Use HTTPS
- Keep all software and dependencies updated
- Avoid exposing sensitive information

## 6. Set up analytics
- Add Google Analytics or another tracking tool
- Monitor traffic after launch

## 7. Connect a domain
- Use a custom domain if available
- Point the domain to the hosting provider

## 8. Test before launch
- Check desktop and mobile versions
- Test all links and images
- Confirm the page loads correctly

## 9. Launch and monitor
- Publish the site
- Review the live version after deployment
- Fix any issues that appear

## 10. Maintain the website
- Update content regularly
- Backup files and keep version history in Git
- Improve SEO and performance over time

## Backend & Database (API) deployment notes
- Install dependencies: run `cd backend && npm install`
- Set a long random `JWT_SECRET`; production startup must never use the development fallback.
- Create a new MySQL database with `node backend/scripts/create_db.js`. The script runs the complete schema for a new database and only safe migrations when an existing database is detected:

```sql
SOURCE /path/to/project/database/schema.sql;
```

- Run migration to add `role`/`is_admin` column:

```sql
SOURCE /path/to/project/database/migrations/001_add_role_to_users.sql;
```

- Create a `.env` file in `backend/` based on `.env.example` and set secure values.
- Start the API server:

```bash
cd backend
npm run dev
```

- Ensure the frontend uses the API base URL `http://your-api-host:PORT` (set `window.API_URL` or host the frontend with the same origin).
- Assign administrative roles through `PATCH /api/admin/users/:id/role` as a `super_admin`.
- Public learning endpoints include `GET /api/courses`, `GET /api/courses/:id`, enrollment, and lesson progress routes.
- Admin video uploads support MP4, WebM, MOV, and M4V files; configure `MAX_FILE_SIZE` for your hosting provider and use the returned URL in a lesson's video field.
- Authentication uses 15-minute access tokens and rotated, database-backed refresh sessions. Keep `JWT_SECRET` private and configure `REFRESH_TOKEN_DAYS`.
- Passwords require at least 12 characters with uppercase, lowercase, number, and special character. Failed logins are throttled and temporarily locked after repeated failures.
- Authenticated behavior events are sent to `POST /api/events`; staff analytics are available at `GET /api/admin/analytics/activity`.
