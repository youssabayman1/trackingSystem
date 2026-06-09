# Attendance And Departure System

This is a Next.js App Router full-stack application where frontend and backend run together on the same server.

## Project Title

trackingSystem

## Installation

Install dependencies with either npm or pnpm:

```bash
npm install
```

```bash
pnpm install
```

## Run (Single Command)

Run both frontend and backend together:

```bash
npm run dev
```

Open http://localhost:3000.

## Supabase Setup

Open the Supabase SQL editor and run these files in order:

- [supabase/schema.sql](supabase/schema.sql)
- [supabase/auth-schema.sql](supabase/auth-schema.sql)

This creates tables for:
- Employees (department + position)
- Attendance records (check-in/check-out)
- Leave balances (holiday vacancy)
- App users (email/password/role)
- Refresh tokens (JWT session rotation)

## Project Architecture

```text
src/
	app/
		api/                      # Backend endpoints
			employees/
			attendance/check-in/
			attendance/check-out/
			attendance/today/
	frontend_lib/
		components/               # UI components
		hooks/                    # Frontend hooks
		types/                    # Frontend types
		utils/                    # Frontend helpers
	backend_lib/
		services/                 # Backend business logic
		infrastructure/           # Supabase and external integrations
		validations/              # Request validation
		types/                    # Backend types
		utils/                    # Backend helpers
lib/                        # Shared utilities
```

## Current Features

- Employee selection by department and position
- Check In action
- Check Out action
- Today attendance list
- Leave balance display for selected employee
- Signup and login pages
- JWT access token + refresh token flow
- Middleware API protection
- Rate limiting for API routes
- Security headers for API responses

Authentication routes:
- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout

Departments:
- dev
- marketing
- backoffice

Positions included:
- ceo
- head
- manager
- hr
- full_stack_developer
- front_end_developer
- vibe_coder
- ui_designer
- ux_designer
- video_creator
- graphic_designer
- backoffice_specialist

## Available Scripts

- `npm run dev`: Start full-stack development server
- `npm run build`: Build production app
- `npm run start`: Start production server
- `npm run lint`: Run lint checks

## Notes

- This README was merged between local and remote changes during push. It includes setup and Supabase guidance.

