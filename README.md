# 🐒 MonkiHub

A full-stack team collaboration and task management platform built with Node.js (Express), vanilla HTML/CSS/JS, XML data storage, Socket.IO for real-time messaging, and Redis (with in-memory fallback) as a message broker.

---

## Project Structure

```
backend/
├── controllers/
│   ├── authController.js
│   ├── taskController.js
│   ├── messageController.js
│   ├── paymentController.js
│   ├── scriptController.js
│   ├── logController.js
│   └── xmlController.js
├── models/
│   ├── UserModel.js
│   ├── TaskModel.js
│   ├── MessageModel.js
│   ├── PaymentModel.js
│   └── LogModel.js
├── routes/
│   ├── authRoutes.js
│   ├── taskRoutes.js
│   ├── messageRoutes.js
│   ├── paymentRoutes.js
│   ├── scriptRoutes.js
│   ├── logRoutes.js
│   └── xmlRoutes.js
├── services/
│   ├── xmlService.js
│   └── brokerService.js
├── middleware/
│   └── auth.js
├── data/
│   ├── users.xml
│   ├── tasks.xml
│   ├── messages.xml
│   ├── payments.xml
│   ├── logs.xml
│   ├── archive.xml
│   └── report.html
├── xslt/
│   ├── messages.xslt
│   ├── tasks.xslt
│   └── logs.xslt
├── scripts/
│   ├── consumer.js
│   ├── notifier.js
│   ├── archiver.js
│   └── reporter.js
└── server.js

frontend/
├── index.html
├── css/style.css
├── js/app.js
└── assets/logo.png
```

---

## Setup & Running

### Prerequisites
- Node.js v18+
- Redis (optional — system works without it)

### Install & Start
```bash
cd backend
npm install
npm start
```

### Open Frontend
Open `frontend/index.html` in a browser.

### Default Credentials
| Username | Password | Role |
|---|---|---|
| admin | password123 | Admin |
| alice | password123 | User |
| bob | password123 | User |

---

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/auth/login | No | Login, returns JWT |
| POST | /api/auth/register | No | Register new user |
| GET | /api/auth/users | Admin | List all users |

### Tasks
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/tasks | Yes | Get tasks (filtered by role) |
| POST | /api/tasks | Admin | Create task |
| PUT | /api/tasks/:id | Admin | Update task |
| DELETE | /api/tasks/:id | Admin | Delete task |

### Messages
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/messages | Yes | Get messages (filter by ?room=) |
| POST | /api/messages | Yes | Send message |

### Payments
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/payments | Yes | Submit payment request |
| GET | /api/payments | Admin | Get all payments with task stats |
| GET | /api/payments/mine | Yes | Get own payments |
| POST | /api/payments/:id/pay | Admin | Mark payment as paid |
| POST | /api/payments/:id/reject | Admin | Reject payment request |
| DELETE | /api/payments/:id | Admin | Delete payment record |

### Scripts
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/scripts/status | Admin | Get status of all scripts |
| POST | /api/scripts/start/:script | Admin | Start a background script |
| POST | /api/scripts/stop/:script | Admin | Stop a running script |
| GET | /api/scripts/report | Admin | View generated HTML report |

### Logs & XML
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/logs | Admin | Get activity logs |
| GET | /api/xml/raw/:file | Yes | Get raw XML file |
| GET | /api/xml/transform/:file | Yes | Get XSLT-transformed HTML |

---

## Background Scripts

All scripts can be run manually or managed via the Script Manager panel (admin only).

### consumer.js — Message Consumer
Subscribes to Redis `monkihub:messages` channel and logs each message to `logs.xml`. Falls back to a simulation if Redis is unavailable.
```bash
node scripts/consumer.js
```

### notifier.js — Auto Notifier
Polls `tasks.xml` every 5 seconds. Sends system messages to the `general` room when new tasks are created or tasks are marked as done. Stops automatically when all tasks are completed.
```bash
node scripts/notifier.js
```

### archiver.js — Auto Archiver
Moves tasks and messages older than 7 days from their XML files into `archive.xml`. Runs once and exits.
```bash
node scripts/archiver.js
```

### reporter.js — Report Generator
Reads all XML data and generates an HTML summary report at `data/report.html` with task stats, per-user breakdowns, and recent activity. Runs once and exits.
```bash
node scripts/reporter.js
```

---

## User Roles

| Role | Permissions |
|---|---|
| admin | Create/edit/delete tasks, view logs, send messages, manage payments, run scripts, view XML |
| user | View assigned tasks, send messages, submit payment requests, view own payments |

---

## Key Features

- **XML as database** — All data stored in XML files, managed via `xml2js`
- **XSLT transformations** — `messages.xslt`, `tasks.xslt`, `logs.xslt` render XML as HTML tables
- **Real-time** — Socket.IO broadcasts task, message, and payment events to all connected clients
- **Payment system** — Users submit payment requests; admins approve/reject with optional proof of payment
- **Script Manager** — Admins can start/stop/monitor background scripts from the UI with live log streaming
- **Redis broker** — PubSub on `monkihub:messages` with in-memory fallback
- **JWT auth** — Stateless authentication with role-based middleware guards
