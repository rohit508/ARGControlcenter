# Project Details (Simple Overview)

Ye file simple language mein batati hai ke ye ERP project kis cheez pa bana hai — database, backend, frontend, aur har API endpoint.

---

## 1. Database

- **Type**: SQLite (ek single file, koi alag database server nahi chalta)
- **Local file**: `server/dev.db`
- **Production file** (Render pa deploy hone ke baad): `/data/dev.db` — ye local `dev.db` se **alag** file hai, alag data
- **ORM**: Drizzle ORM (TypeScript se database ko query karne ke liye)
- **Schema files**: `server/src/db/schema*.ts`
- **Migrations**: `server/drizzle/*.sql` (drizzle-kit se generate hoti hain)
- **Seed data**: `server/src/db/seed.ts` — sara demo/real employee roster yahan se ban'ta hai

---

## 2. Backend

- **Framework**: Express.js
- **Language**: TypeScript
- **Auth**: JWT (access token + refresh token)
- **Password hashing**: bcrypt
- **Validation**: Zod
- **Location**: `server/` folder
- **Local URL**: `http://localhost:4000`
- **All API routes prefix**: `/api/v1/...`
- **Run locally**: `npm run dev` (inside `server/`)
- **Deployment config**: `render.yaml` (Render.com)

---

## 3. Frontend

- **Framework**: React 18 + TypeScript
- **Build tool**: Vite
- **Routing**: React Router v6
- **State management**: Zustand (auth store, UI store)
- **Server data/caching**: TanStack React Query
- **Styling**: Tailwind CSS
- **Offline support**: Dexie (IndexedDB)
- **Location**: `client/` folder
- **Local URL**: `http://localhost:5173`
- **Run locally**: `npm run dev` (inside `client/`)
- **Deployment config**: `netlify.toml` (Netlify)

---

## 4. Login / Roles

- **Admin**: full access to everything
- **User**: sirf apne "My Tasks" aur "Task Analytics" (Task Board) tak access
- Baaki roles (Finance, HR, Procurement, CEO, ProjectManager, etc.) apne specific module tak access rakhte hain

---

## 5. All API Endpoints

Har route ke sath ye likha hai: **method + full URL + kya karta hai**.
Local base URL: `http://localhost:4000`. Production mein `localhost:4000` ki jagah apna live backend domain use karo.
Sab routes ke liye login zaroori hai (except Auth ke pehle 3), aur zyada tar Create/Update/Delete ke liye role/permission bhi chahiye.

### Auth
| Method | Full URL | Kaam |
|---|---|---|
| POST | http://localhost:4000/api/v1/auth/login | Login karna (email + password) |
| POST | http://localhost:4000/api/v1/auth/refresh | Naya access token lena |
| POST | http://localhost:4000/api/v1/auth/logout | Logout karna |
| GET | http://localhost:4000/api/v1/auth/me | Apni profile dekhna |

### Employee Tasks
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/employee-tasks | Sab tasks ki list |
| GET | http://localhost:4000/api/v1/employee-tasks/stats | Task completion stats |
| GET | http://localhost:4000/api/v1/employee-tasks/:id | Ek task dekhna |
| POST | http://localhost:4000/api/v1/employee-tasks | Naya task banana |
| PATCH | http://localhost:4000/api/v1/employee-tasks/:id | Task update karna |
| DELETE | http://localhost:4000/api/v1/employee-tasks/:id | Task delete karna |
| PATCH | http://localhost:4000/api/v1/employee-tasks/assignments/:assignmentId/status | Apne task ka status update karna |
| GET | http://localhost:4000/api/v1/employee-tasks/assignments/:assignmentId/comments | Ticket ke comments dekhna |
| POST | http://localhost:4000/api/v1/employee-tasks/assignments/:assignmentId/comments | Comment ya voice note add karna |

### Employees
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/employees | Employees ki list |
| GET | http://localhost:4000/api/v1/employees/:id | Ek employee dekhna |
| POST | http://localhost:4000/api/v1/employees | Naya employee add karna |
| PATCH | http://localhost:4000/api/v1/employees/:id | Employee update karna |
| DELETE | http://localhost:4000/api/v1/employees/:id | Employee delete karna |
| POST | http://localhost:4000/api/v1/employees/:id/create-login | Employee ka login account banana |
| PUT | http://localhost:4000/api/v1/employees/:id/roles | Employee ke roles set karna |

### Departments
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/departments | Departments ki list |

### Attachments
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/attachments | Kisi entity ke attachments dekhna |
| POST | http://localhost:4000/api/v1/attachments | File/voice note upload karna |
| GET | http://localhost:4000/api/v1/attachments/:id/download | File download karna |
| DELETE | http://localhost:4000/api/v1/attachments/:id | Attachment delete karna |

### RBAC — Roles & Permissions
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/rbac/matrix | Roles x Permissions table dekhna |
| POST | http://localhost:4000/api/v1/rbac/roles | Naya role banana |
| PUT | http://localhost:4000/api/v1/rbac/roles/:roleId/permissions | Role ki permissions set karna |

### Projects
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/projects | Projects ki list |
| GET | http://localhost:4000/api/v1/projects/:id | Ek project dekhna |
| POST | http://localhost:4000/api/v1/projects | Naya project banana |
| PATCH | http://localhost:4000/api/v1/projects/:id | Project update karna |
| DELETE | http://localhost:4000/api/v1/projects/:id | Project delete karna |
| POST | http://localhost:4000/api/v1/projects/:id/recalculate | Project ke metrics recalculate karna |

### Tasks
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/tasks | Tasks ki list |
| GET | http://localhost:4000/api/v1/tasks/:id | Ek task dekhna |
| POST | http://localhost:4000/api/v1/tasks | Naya task banana |
| PATCH | http://localhost:4000/api/v1/tasks/:id | Task update karna |
| PATCH | http://localhost:4000/api/v1/tasks/:id/progress | Task progress % update karna |
| DELETE | http://localhost:4000/api/v1/tasks/:id | Task delete karna |

### Risks
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/risks | Risks ki list |
| GET | http://localhost:4000/api/v1/risks/heatmap | Risk heatmap data |
| GET | http://localhost:4000/api/v1/risks/:id | Ek risk dekhna |
| POST | http://localhost:4000/api/v1/risks | Naya risk add karna |
| PATCH | http://localhost:4000/api/v1/risks/:id | Risk update karna |
| DELETE | http://localhost:4000/api/v1/risks/:id | Risk delete karna |

### Issues
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/issues | Issues ki list |
| GET | http://localhost:4000/api/v1/issues/:id | Ek issue dekhna |
| POST | http://localhost:4000/api/v1/issues | Naya issue add karna |
| PATCH | http://localhost:4000/api/v1/issues/:id | Issue update karna |
| DELETE | http://localhost:4000/api/v1/issues/:id | Issue delete karna |

### Budget Entries
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/budget-entries | Budget entries ki list |
| GET | http://localhost:4000/api/v1/budget-entries/:id | Ek entry dekhna |
| POST | http://localhost:4000/api/v1/budget-entries | Nayi entry add karna |
| PATCH | http://localhost:4000/api/v1/budget-entries/:id | Entry update karna |
| DELETE | http://localhost:4000/api/v1/budget-entries/:id | Entry delete karna |

### Change Requests
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/change-requests | Change requests ki list |
| GET | http://localhost:4000/api/v1/change-requests/:id | Ek request dekhna |
| POST | http://localhost:4000/api/v1/change-requests | Nayi request banana |
| PATCH | http://localhost:4000/api/v1/change-requests/:id | Request update karna |
| DELETE | http://localhost:4000/api/v1/change-requests/:id | Request delete karna |
| POST | http://localhost:4000/api/v1/change-requests/:id/submit | Approval ke liye submit karna |
| POST | http://localhost:4000/api/v1/change-requests/:id/approve | Approve karna |
| POST | http://localhost:4000/api/v1/change-requests/:id/reject | Reject karna |

### Milestones
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/milestones | Milestones ki list |
| GET | http://localhost:4000/api/v1/milestones/:id | Ek milestone dekhna |
| POST | http://localhost:4000/api/v1/milestones | Naya milestone banana |
| PATCH | http://localhost:4000/api/v1/milestones/:id | Milestone update karna |
| DELETE | http://localhost:4000/api/v1/milestones/:id | Milestone delete karna |

### Meetings
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/meetings | Meetings ki list |
| GET | http://localhost:4000/api/v1/meetings/:id | Ek meeting dekhna |
| POST | http://localhost:4000/api/v1/meetings | Nayi meeting add karna |
| PATCH | http://localhost:4000/api/v1/meetings/:id | Meeting update karna |
| DELETE | http://localhost:4000/api/v1/meetings/:id | Meeting delete karna |

### Action Items
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/action-items | Action items ki list |
| GET | http://localhost:4000/api/v1/action-items/with-meeting-context | Meeting details ke sath list |
| GET | http://localhost:4000/api/v1/action-items/:id | Ek item dekhna |
| POST | http://localhost:4000/api/v1/action-items | Naya item banana |
| PATCH | http://localhost:4000/api/v1/action-items/:id | Item update karna |
| DELETE | http://localhost:4000/api/v1/action-items/:id | Item delete karna |

### Lessons Learned
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/lessons-learned | List dekhna |
| GET | http://localhost:4000/api/v1/lessons-learned/search | Keyword se search karna |
| GET | http://localhost:4000/api/v1/lessons-learned/:id | Ek lesson dekhna |
| POST | http://localhost:4000/api/v1/lessons-learned | Naya lesson add karna |
| PATCH | http://localhost:4000/api/v1/lessons-learned/:id | Update karna |
| DELETE | http://localhost:4000/api/v1/lessons-learned/:id | Delete karna |

### KPI Engine
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/kpi-engine/portfolio | Portfolio-wide summary |
| GET | http://localhost:4000/api/v1/kpi-engine/status-distribution | Project status counts |
| GET | http://localhost:4000/api/v1/kpi-engine/cost-breakdown | Cost category breakdown |
| GET | http://localhost:4000/api/v1/kpi-engine/top-risks | Sabse bade risks |
| GET | http://localhost:4000/api/v1/kpi-engine/top-delayed-projects | Sabse zyada late projects |
| POST | http://localhost:4000/api/v1/kpi-engine/snapshot | KPI snapshot lena (Admin only) |
| GET | http://localhost:4000/api/v1/kpi-engine/history | Purani KPI history dekhna |

### Config / Lookups
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/config/lookups | Sab lookup lists dekhna |
| GET | http://localhost:4000/api/v1/config/lookups/:code | Ek lookup list dekhna |
| POST | http://localhost:4000/api/v1/config/lookups/:code/values | Lookup list mein value add karna |

### Gantt
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/gantt | Gantt chart data |

### Workflows
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/workflows/pending | Apni pending approvals dekhna |
| POST | http://localhost:4000/api/v1/workflows/:instanceId/act | Approve/Reject karna |

### Resources
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/resources | Employees ki utilization list |
| GET | http://localhost:4000/api/v1/resources/:id/utilization | Ek employee ki detail |

### Leads
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/leads | Leads ki list |
| GET | http://localhost:4000/api/v1/leads/:id | Ek lead dekhna |
| POST | http://localhost:4000/api/v1/leads | Naya lead add karna |
| PATCH | http://localhost:4000/api/v1/leads/:id | Lead update karna |
| DELETE | http://localhost:4000/api/v1/leads/:id | Lead delete karna |
| POST | http://localhost:4000/api/v1/leads/:id/convert | Lead ko customer mein convert karna |

### Customers
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/customers | Customers ki list |
| GET | http://localhost:4000/api/v1/customers/:id | Ek customer dekhna |
| POST | http://localhost:4000/api/v1/customers | Naya customer add karna |
| PATCH | http://localhost:4000/api/v1/customers/:id | Update karna |
| DELETE | http://localhost:4000/api/v1/customers/:id | Delete karna |

### Opportunities
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/opportunities | Opportunities ki list |
| GET | http://localhost:4000/api/v1/opportunities/pipeline | Sales pipeline dekhna |
| GET | http://localhost:4000/api/v1/opportunities/:id | Ek opportunity dekhna |
| POST | http://localhost:4000/api/v1/opportunities | Nayi opportunity add karna |
| PATCH | http://localhost:4000/api/v1/opportunities/:id | Update karna |
| DELETE | http://localhost:4000/api/v1/opportunities/:id | Delete karna |

### Finance
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/finance/accounts | Chart of accounts dekhna |
| POST | http://localhost:4000/api/v1/finance/accounts | Naya account banana |
| GET | http://localhost:4000/api/v1/finance/journal-entries | Journal entries dekhna |
| GET | http://localhost:4000/api/v1/finance/journal-entries/:id | Ek entry dekhna |
| POST | http://localhost:4000/api/v1/finance/journal-entries | Nayi entry banana |
| POST | http://localhost:4000/api/v1/finance/journal-entries/:id/reverse | Entry reverse karna |
| GET | http://localhost:4000/api/v1/finance/trial-balance | Trial balance report |

### Vendors
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/vendors | Vendors ki list |
| GET | http://localhost:4000/api/v1/vendors/:id | Ek vendor dekhna |
| POST | http://localhost:4000/api/v1/vendors | Naya vendor add karna |
| PATCH | http://localhost:4000/api/v1/vendors/:id | Update karna |
| DELETE | http://localhost:4000/api/v1/vendors/:id | Delete karna |

### Purchase Orders
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/purchase-orders | Purchase orders ki list |
| POST | http://localhost:4000/api/v1/purchase-orders/with-lines | Order + line items ek sath banana |
| GET | http://localhost:4000/api/v1/purchase-orders/:id/lines | Order ki line items dekhna |
| POST | http://localhost:4000/api/v1/purchase-orders/:id/submit | Approval ke liye submit karna |
| POST | http://localhost:4000/api/v1/purchase-orders/:id/approve | Approve karna |
| POST | http://localhost:4000/api/v1/purchase-orders/:id/reject | Reject karna |
| GET | http://localhost:4000/api/v1/purchase-orders/:id | Ek order dekhna |
| POST | http://localhost:4000/api/v1/purchase-orders | Khali order banana |
| PATCH | http://localhost:4000/api/v1/purchase-orders/:id | Order update karna |
| DELETE | http://localhost:4000/api/v1/purchase-orders/:id | Order delete karna |

### Leave Requests
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/leave-requests | Leave requests ki list |
| POST | http://localhost:4000/api/v1/leave-requests/:id/approve | Approve karna |
| POST | http://localhost:4000/api/v1/leave-requests/:id/reject | Reject karna |
| GET | http://localhost:4000/api/v1/leave-requests/:id | Ek request dekhna |
| POST | http://localhost:4000/api/v1/leave-requests | Nayi leave request banana |
| PATCH | http://localhost:4000/api/v1/leave-requests/:id | Update karna |
| DELETE | http://localhost:4000/api/v1/leave-requests/:id | Delete karna |

### Attendance
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/attendance | Attendance records dekhna |
| GET | http://localhost:4000/api/v1/attendance/summary | Monthly summary dekhna |
| GET | http://localhost:4000/api/v1/attendance/:id | Ek record dekhna |
| POST | http://localhost:4000/api/v1/attendance | Naya record add karna |
| PATCH | http://localhost:4000/api/v1/attendance/:id | Update karna |
| DELETE | http://localhost:4000/api/v1/attendance/:id | Delete karna |

### Inventory
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/inventory/warehouses | Warehouses ki list |
| POST | http://localhost:4000/api/v1/inventory/warehouses | Naya warehouse banana |
| GET | http://localhost:4000/api/v1/inventory/items | Stock items ki list |
| POST | http://localhost:4000/api/v1/inventory/items | Naya item add karna |
| GET | http://localhost:4000/api/v1/inventory/levels | Stock levels dekhna |
| GET | http://localhost:4000/api/v1/inventory/low-stock | Kam stock wale items dekhna |
| GET | http://localhost:4000/api/v1/inventory/transactions | Stock transactions dekhna |
| POST | http://localhost:4000/api/v1/inventory/transactions | Nayi transaction record karna |

### Manufacturing
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/manufacturing/work-centers | Work centers dekhna |
| POST | http://localhost:4000/api/v1/manufacturing/work-centers | Naya work center banana |
| GET | http://localhost:4000/api/v1/manufacturing/boms | Bills of materials dekhna |
| GET | http://localhost:4000/api/v1/manufacturing/boms/:id/lines | BOM ki lines dekhna |
| POST | http://localhost:4000/api/v1/manufacturing/boms | Naya BOM banana |
| GET | http://localhost:4000/api/v1/manufacturing/production-orders | Production orders dekhna |
| POST | http://localhost:4000/api/v1/manufacturing/production-orders | Naya production order banana |
| POST | http://localhost:4000/api/v1/manufacturing/production-orders/:id/complete | Order complete karna |

### Assets
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/assets | Assets ki list |
| GET | http://localhost:4000/api/v1/assets/register | Asset register (depreciation ke sath) |
| GET | http://localhost:4000/api/v1/assets/maintenance | Maintenance logs dekhna |
| POST | http://localhost:4000/api/v1/assets/maintenance | Maintenance schedule karna |
| POST | http://localhost:4000/api/v1/assets/maintenance/:id/complete | Maintenance complete karna |
| GET | http://localhost:4000/api/v1/assets/:id | Ek asset dekhna |
| POST | http://localhost:4000/api/v1/assets | Naya asset add karna |
| PATCH | http://localhost:4000/api/v1/assets/:id | Update karna |
| DELETE | http://localhost:4000/api/v1/assets/:id | Delete karna |

### Tickets / Help Desk
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/tickets | Tickets ki list |
| GET | http://localhost:4000/api/v1/tickets/with-sla | SLA status ke sath list |
| POST | http://localhost:4000/api/v1/tickets/:id/resolve | Ticket resolve karna |
| GET | http://localhost:4000/api/v1/tickets/:id | Ek ticket dekhna |
| POST | http://localhost:4000/api/v1/tickets | Naya ticket banana |
| PATCH | http://localhost:4000/api/v1/tickets/:id | Update karna |
| DELETE | http://localhost:4000/api/v1/tickets/:id | Delete karna |

### KB Articles
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/kb-articles | Articles ki list |
| GET | http://localhost:4000/api/v1/kb-articles/search | Keyword se search |
| GET | http://localhost:4000/api/v1/kb-articles/:id | Ek article dekhna |
| POST | http://localhost:4000/api/v1/kb-articles | Naya article banana |
| PATCH | http://localhost:4000/api/v1/kb-articles/:id | Update karna |
| DELETE | http://localhost:4000/api/v1/kb-articles/:id | Delete karna |

### Analytics
| Method | Full URL | Kaam |
|---|---|---|
| GET | http://localhost:4000/api/v1/analytics/budget-forecast | Budget overrun forecast |
| GET | http://localhost:4000/api/v1/analytics/schedule-forecast | Schedule slip forecast |
| GET | http://localhost:4000/api/v1/analytics/smart-alerts | Automatic alerts dekhna |
| GET | http://localhost:4000/api/v1/analytics/search | Sab modules mein search karna |

---

## 6. Quick Summary

- **1 Database** (SQLite file) → sara data ek jagah
- **1 Backend** (Express + TypeScript) → sab APIs yahan se serve hoti hain
- **1 Frontend** (React + TypeScript) → user ye dekhta hai
- **34 API modules**, har module ke apne routes — zyada tar List/Get/Create/Update/Delete pattern follow karte hain
- Har request ke liye login (JWT token) zaroori hai, sirf login/refresh/logout free hain
