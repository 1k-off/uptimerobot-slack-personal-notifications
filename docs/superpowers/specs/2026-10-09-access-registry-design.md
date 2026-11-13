# Access Registry — Design Spec

Date: 2026-10-09  
Status: approved (conversation)

## Goal

Convenient Access Registry UI in the UCC dashboard that manages GLPI custom assets **Accesses** and **Projects**. Local DB stores only an audit log of who did what. GLPI remains source of truth. No hard purge from the app.

## Decisions

- UI approach: **user-centric** (pick user → manage their accesses)
- GLPI API: **high-level OAuth only** (`/api.php/v2.3/...`), not legacy `/apirest.php`
- Soft-delete Accesses via `DELETE .../{id}` without `force` (trash)
- Projects: find-or-create by name (same UX pattern as monitoring groups); never delete Projects from the app
- Role: `AccessManager` mirrors Admin (`ACCESS_MANAGER_EMAILS`, `ACCESS_MANAGER_GROUPS`, Azure AD app role `AccessManager`)
- **Admin implies Access Manager** (`isAccessManager = isAdmin || …`)
- Audit: separate Mongo collection `access_audit_logs`; do not reuse monitor `audit_logs` (`websiteId`-centric)

## Architecture

```
Browser → Next.js pages (/access-management)
       → API (/api/access-management/*) + requireAccessManager
       → lib/glpi (OAuth password grant, token cache)
       → GLPI HL API
       → Mongo access_audit_logs (mutations only)
```

### Env

- `GLPI_URL`
- `GLPI_OAUTH_CLIENT_ID`
- `GLPI_OAUTH_CLIENT_SECRET`
- `GLPI_USERNAME`
- `GLPI_PASSWORD`
- `ACCESS_MANAGER_EMAILS` (comma-separated)
- `ACCESS_MANAGER_GROUPS` (comma-separated)

Legacy `GLPI_APP_TOKEN` / `GLPI_USER_TOKEN` are not used by this feature.

### GLPI endpoints (verified)

| Resource | Path |
|----------|------|
| Users | `GET /Administration/User` |
| Projects | `GET/POST /Assets/Custom/Projects` |
| Accesses | `GET/POST /Assets/Custom/Accesses` |
| Access by id | `GET/PATCH/DELETE /Assets/Custom/Accesses/{id}` |

Soft-delete: `DELETE` with default `force=false`.

### Access field mapping

| UI | GLPI |
|----|------|
| Name | `name` |
| User | `user.id` |
| Project | `custom_fields.projects` (custom asset Projects, not native Project) |
| Given By | `custom_fields.given_by` |
| Request Ticket | `custom_fields.request_ticket` |
| URL | `custom_fields.url` |

**Verified:** Despite OpenAPI marking `custom_fields` as `readOnly`, POST/PATCH accept nested `custom_fields` (`given_by`, `projects` as project id string, `request_ticket`, `url`). Soft-delete sets `is_deleted: true`.

## Auth & routing

- Session flag `isAccessManager` computed like `isAdmin`
- Header: top-level **Access management** when `isAccessManager` (not nested under Admin)
- `proxy.ts` protects `/access-management` and `/api/access-management`
- Pages: `/access-management`, `/access-management/users/[id]`, `/access-management/audit`

## App API

All require Access Manager:

- `GET /api/access-management/users?q=`
- `GET /api/access-management/users/[id]/accesses`
- `GET /api/access-management/projects?q=`
- `POST /api/access-management/accesses` (resolves/creates project)
- `PATCH /api/access-management/accesses/[id]`
- `DELETE /api/access-management/accesses/[id]` (soft)
- `GET /api/access-management/audit`

## UI

1. Users list with search
2. User detail: accesses table + add/edit/soft-delete
3. `ProjectAutocomplete` modeled on `GroupAutocomplete`
4. Access audit page for Access Managers

Reuse existing UI primitives / layout patterns from the monitors/admin pages.

## Audit document

```ts
{
  action: 'created' | 'updated' | 'deleted',
  actor: string,
  accessId: number,
  glpiUserId: number,
  accessName?: string,
  projectId?: number,
  projectName?: string,
  fields?: string[],
  summary: string,
  at: Date
}
```

Append on every successful create/update/soft-delete.

## Out of scope

- Hard purge of GLPI items
- Editing/deleting Projects except find-or-create used by Access forms
- Storing Access/Project/User copies in Mongo
- Legacy GLPI API
- Changing GLPI server code

## Manual Azure setup

Create App Role `AccessManager` on the Azure AD app registration (same pattern as `Admin`), assign to users/groups as needed.
