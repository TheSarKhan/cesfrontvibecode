# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

```bash
# Infrastructure (PostgreSQL 16 + Redis 7)
cd backend && docker-compose up -d

# Backend (Spring Boot 3.4.3, Java 21)
cd backend && mvn spring-boot:run        # runs on :8083

# Frontend (React 19 + Vite)
cd frontend && npm install && npm run dev # runs on :3000, proxies /api → :8083
```

## Build & Test

```bash
# Backend
mvn clean package          # build JAR
mvn test                   # run tests

# Frontend
npm run build              # production build → dist/
npm run lint               # ESLint
```

## Architecture

Monorepo ERP for construction equipment rental/transport/service. Two top-level directories: `frontend/` and `backend/`.

### Backend (Spring Boot)

- **Port:** 8083, API base: `/api/*`
- **DB:** PostgreSQL on port 5434 (db: ces_erp), Redis on port 6381
- **Auth:** JWT access/refresh tokens (jjwt 0.12.6), Spring Security with `@PreAuthorize` method-level RBAC
- **API Docs:** Swagger UI at `/swagger-ui.html`, OpenAPI at `/api-docs`
- **File uploads:** max 50MB, stored at `C:/Users/serxa/ces-uploads`

**Module structure:** Each module follows `controller → service → repository → entity` pattern under `com.ces.erp.{module}/`.

**Cross-cutting concerns:**
- `BaseEntity` — all entities extend this: `id`, `createdAt`, `updatedAt`, `deleted`, `deletedAt`, `softDelete()`
- `ApiResponse<T>` — all endpoints return `{success, message, data}` wrapper
- `@RequiresApproval` — AOP annotation triggers approval workflow, returns 202 with PendingOperation
- `AuditLog` — AOP aspect captures changes for audit trail
- `GlobalExceptionHandler` — centralized exception handling

### Frontend (React + Vite + Tailwind CSS v4)

- **State:** Zustand (`authStore` for login/logout/hasPermission)
- **HTTP:** Axios instance with interceptors — auto-refreshes on 401 with request queue, redirects to `/login` on failure
- **Routing:** React Router v7, `ProtectedRoute` for auth pages, `GuestRoute` for login
- **Icons:** lucide-react, **Notifications:** react-hot-toast

**Module structure:** Each module has `src/pages/{module}/` (page + sub-components), `src/api/{module}.js` (API calls).

## Core Modules

Customer, Contractor, User, Role, Garage (equipment), Requests, Coordinator, Projects, Accounting, Service — plus Operators, Investors, Approval, Audit, Trash (soft-delete recovery), Dashboard.

## Conventions

- **Language:** All UI labels, toast messages, and validation messages in Azerbaijani
- **Permission labels:** Oxumaq=GET, Yazmaq=POST, Redaktə=PUT, Silmək=DELETE
- **Permission check:** `useAuthStore().hasPermission(moduleCode, action)` on frontend, `@PreAuthorize("hasAuthority('MODULE:ACTION')")` on backend
- **Design tokens:** accent `amber-600` (#D97706) for buttons/checkboxes/active states, sidebar active `orange-500`, cards `rounded-xl border-gray-200 hover:shadow-md`, modals `rounded-2xl` with amber X close button
- **Soft delete everywhere** — never hard-delete, use `softDelete()` on backend, `window.confirm` on frontend
- **Frontend only** — typical workflow is frontend module builds; backend changes are rare
