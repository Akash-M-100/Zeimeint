# Zeminent LMS — Backend

Production-ready Learning Management System backend built with **Node.js + Express + MongoDB**.

Auth & RBAC · Courses & Lectures CRUD · S3 + CloudFront video delivery · Razorpay payments · free-preview access control.

---

## Tech stack

| Concern        | Library                          |
| -------------- | -------------------------------- |
| Server         | Express.js                       |
| Database       | MongoDB + Mongoose               |
| Auth           | JWT (`jsonwebtoken`) + `bcryptjs`|
| Video delivery | Browser → S3 (presigned PUT) → signed CloudFront URLs |
| Thumbnails     | Multer (memory) → S3             |
| Payments       | Razorpay                         |
| Security       | Helmet, CORS, express-rate-limit, express-validator |

## Project structure

```
src/
  config/       env loading + validation, Mongo & S3 setup
  models/       Mongoose schemas — User, Course, Lecture, Payment
  middleware/   auth, role (RBAC), error handler, multer upload, validation, rate limit
  validators/   express-validator rule chains
  controllers/  thin HTTP layer — parse req, call service, send ApiResponse
  services/     business logic — auth, course, lecture, payment, s3, razorpay, seedAdmin
  routes/       route definitions wired to controllers
  utils/        ApiError, ApiResponse, asyncHandler, generateToken
  app.js        Express app (middleware + routes + error handling)
  server.js     entry point — connects DB, seeds admin, starts HTTP server
```

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
#    .env is already present with your MongoDB URI + JWT secret.
#    Fill in AWS_* and RAZORPAY_* to enable video/thumbnail uploads + payments.

# 3. Run
npm run dev      # nodemon, auto-reload
npm start        # plain node
```

The server starts on `http://localhost:4000/api`. On boot it connects to MongoDB and **auto-seeds the default admin** if missing.

### Environment variables (`.env`)

| Variable | Required | Notes |
| -------- | -------- | ----- |
| `MONGODB_URI` | ✅ | Mongo connection string |
| `JWT_SECRET` | ✅ | Signing secret for JWTs |
| `JWT_EXPIRES_IN` | | Token lifetime, default `7d` |
| `OAUTH_BRIDGE_SECRET` | ✅ | Shared secret with the Next.js OAuth Route Handler — sent as the `X-Bridge-Secret` header on `/api/auth/oauth`. Server refuses to boot without it. |
| `PORT` | | Default `4000` |
| `CORS_ORIGIN` | | Comma-separated allowed origins |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | | Default admin, auto-seeded |
| `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_VIDEO_BUCKET` | | Required for video + thumbnail uploads |
| `AWS_CLOUDFRONT_DOMAIN` / `AWS_CLOUDFRONT_KEY_PAIR_ID` / `AWS_CLOUDFRONT_PRIVATE_KEY_PATH` | | Optional — enables signed CloudFront playback URLs; without them the server falls back to S3 presigned URLs |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | | Required for payments |

> S3 / Razorpay are **optional at boot** — the server still runs without them, but the related endpoints return a clear `not configured` error. CloudFront is optional even when S3 is set: playback URLs fall back to S3 presigned GET URLs until the CloudFront key pair + private key are provided.

### Default admin

Auto-created on first startup:

```
email:    admin@lms.com
password: admin123
```

## Authentication

- Send the JWT as `Authorization: Bearer <token>` on protected routes.
- Roles: `student` (default) and `admin`.
- `login` works for both roles; `admin/login` additionally rejects non-admins.

## API reference

Base URL: `/api` · Standard envelope: `{ "success": boolean, "message": string, "data": any }`

### Auth — `/api/auth`

| Method | Path | Access | Body |
| ------ | ---- | ------ | ---- |
| POST | `/register` | public | `{ name, email, password }` |
| POST | `/login` | public | `{ email, password }` |
| POST | `/admin/login` | public | `{ email, password }` — admin only |
| POST | `/oauth` | bridge secret | `{ provider, providerUserId, email, emailVerified, name }` — server-to-server from the Next.js OAuth Route Handler. Auth via `X-Bridge-Secret` header (`OAUTH_BRIDGE_SECRET`). |
| GET  | `/me` | auth | — |

### Courses — `/api/courses`

| Method | Path | Access | Notes |
| ------ | ---- | ------ | ----- |
| GET    | `/` | public | Filters: `?category=&search=&page=&limit=`. Students see published only. |
| GET    | `/:id` | public | Includes access-gated lecture list. |
| POST   | `/` | admin | `multipart/form-data`: `title, description, category, price?, isPublished?` + optional `thumbnail` file |
| PATCH  | `/:id` | admin | Any subset of the above fields. |
| DELETE | `/:id` | admin | Cascades — deletes lectures + their S3 assets. |

### Lectures

Videos are uploaded **directly to S3 by the browser**: ask for a presigned URL, `PUT` the file to it, then POST the metadata referencing the returned key.

| Method | Path | Access | Notes |
| ------ | ---- | ------ | ----- |
| POST   | `/api/lectures/presign-upload` | admin | `{ filename, contentType }` → `{ key, uploadUrl }` (presigned S3 PUT). |
| GET    | `/api/courses/:courseId/lectures` | public | Access-gated list; accessible lectures carry a signed playback URL. |
| POST   | `/api/courses/:courseId/lectures` | admin | JSON: `{ title, description?, order?, isPreviewFree?, sectionId?, video: { key, duration, size, format } }` |
| GET    | `/api/lectures/:id` | public | `403` if the lecture is locked for the viewer. |
| PATCH  | `/api/lectures/:id` | admin | JSON metadata; include `video: { key, ... }` to replace the video. |
| DELETE | `/api/lectures/:id` | admin | Removes the S3 asset too. |

### Payments — `/api/payments` (all require auth)

| Method | Path | Body | Notes |
| ------ | ---- | ---- | ----- |
| POST | `/create-order` | `{ courseId }` | Returns a Razorpay order + `keyId`. Free courses unlock instantly. |
| POST | `/verify` | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` | Verifies the HMAC signature, unlocks the course. |
| GET  | `/history` | — | The user's payment history. |

## Access control — free preview

- **Admins** and users who **purchased** a course → every lecture in full.
- **Everyone else** → the first **2 lectures** (by `order`) plus any lecture flagged `isPreviewFree`.
- Locked lectures keep their metadata but carry no playback URL and `locked: true` is set.

## Payment flow (Razorpay)

1. Frontend calls `POST /api/payments/create-order` with `courseId` → gets `{ order, keyId }`.
2. Frontend opens Razorpay Checkout with those values.
3. On success Razorpay returns `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`.
4. Frontend calls `POST /api/payments/verify` with those three values.
5. Backend verifies the HMAC-SHA256 signature, marks the `Payment` as `paid`, and adds the course to the user's `purchasedCourses`.

## OAuth bridge

Google / GitHub OAuth runs in the Next.js app (with [arctic](https://arcticjs.dev/)). After the provider exchange completes there, the Next.js Route Handler calls `POST /api/auth/oauth` on this API with the verified profile.

Authentication on the bridge is a shared secret (`OAUTH_BRIDGE_SECRET`) sent as the `X-Bridge-Secret` header. The header is compared in constant time; missing or wrong → opaque 401. The endpoint also requires the standard `oauthSignInValidator` payload and is rate-limited to 10 requests / minute.

Service flow ([src/services/oauth.service.js](src/services/oauth.service.js)) — 3-branch upsert:
1. Find by `{provider, providerUserId}` → existing linked user.
2. Find by email (when the provider reports `emailVerified: true`) → push the new identity into the user's `accounts` array.
3. Create a new student with `accounts: [{...}]` and no password (the schema's `password.required` is conditional on `accounts.length === 0`).
