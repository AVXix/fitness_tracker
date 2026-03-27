# Fitness Tracker - Project Progress So Far

Date: March 27, 2026

## 1) Project Goal
Implement:
- User management (Register and Login)
- Minimum 2 features

Chosen features implemented:
- User profile management
- Community forum with comments

## 2) Stack We Are Using
Frontend and framework:
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS

Backend and data:
- Next.js Server Actions + Route logic in App Router
- Prisma ORM (v7)
- SQLite (local file database for development)

Authentication:
- Custom email/password auth
- Password hashing with bcryptjs
- Signed session cookie using HMAC (httpOnly cookie)

## 3) Environment Setup We Did
Current environment file:
- .env

Current variable in use:
- DATABASE_URL=file:./dev.db

Auth secret logic in code:
- Uses SESSION_SECRET if available
- Falls back to NEXTAUTH_SECRET if available
- Falls back to a development-only default string if neither is set

Recommended production env variables:
- DATABASE_URL (Postgres URL when deploying)
- SESSION_SECRET (required in production)

## 4) Database and Schema Work Completed
Prisma schema created/updated with:
- Role enum (USER, ADMIN)
- User model
- ForumPost model
- ForumComment model

Migration completed:
- prisma/migrations/20260327164731_milestone2_minimal

Database location (local):
- dev.db

Prisma runtime setup:
- Prisma 7 SQLite adapter configured in src/lib/prisma.ts

## 5) Features Implemented So Far
Authentication and user management:
- Register page created
- Login page created
- Logout action created
- Session creation and validation implemented
- Protected route guard implemented for authenticated pages

Feature 1 - User profile management:
- Profile page created
- View user details (email, role)
- Update profile fields (name, bio, goal)

Feature 2 - Community forum:
- Forum page created
- Create new post
- List posts with author details
- Add comments to posts
- List comments with author details

Homepage:
- Updated to show navigation based on login state

## 6) Commands and Verification Already Done
Completed successfully:
- Prisma client generation
- Prisma migration
- Lint check
- Production build
- Dev server startup test

## 7) Notes About Deployment
Important:
- Current DB is SQLite (good for local development)
- For deployment, move to managed Postgres (Neon or Supabase recommended)

Why:
- Better reliability and persistence in hosted environments
- Easier production-ready setup for Next.js apps

## 8) Current Project Status
The core project scope is now functionally implemented with:
- Register/Login
- User Profile feature
- Forum + Comments feature

Remaining recommended tasks before final submission/deployment:
- Add production SESSION_SECRET
- Move DATABASE_URL from SQLite to managed Postgres
- Deploy to a Node-compatible platform (Vercel recommended)
- Optional: small UI polish and validation improvements
