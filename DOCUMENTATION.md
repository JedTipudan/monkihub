# MonkiHub — System Documentation

## 1. System Overview

MonkiHub is a full-stack team collaboration and task management platform built with Node.js (Express) on the backend and vanilla HTML/CSS/JS on the frontend. It uses XML files as its data store, XSLT for data transformation, Socket.IO for real-time messaging, and Redis (with in-memory fallback) as a message broker.

---

## 2. MVC Architecture

```
backend/
├── models/          ← DATA LAYER (XML read/write/validate)
│   ├── UserModel.js
│   ├── TaskModel.js
│   ├── MessageModel.js
│   └── LogModel.js
├── controllers/     ← LOGIC LAYER (request/response handling)
│   ├── authController.js
│   ├── taskController.js
│   ├── messageController.js
│   ├── logController.js
│   └── xmlController.js
├── routes/          ← ROUTING LAYER (API endpoint definitions)
│   ├── authRoutes.js
│   ├── taskRoutes.js
│   ├── messageRoutes.js
│   ├── logRoutes.js
│   └── xmlRoutes.js
├── services/        ← SERVICE LAYER (XML processing, broker)
│   ├── xmlService.js
│   └── brokerService.js
├── middleware/      ← MIDDLEWARE (JWT auth, role guard)
│   └── auth.js
├── data/            ← XML DATA FILES
│   ├── messages.xml
│   ├── tasks.xml
│   ├── logs.xml
│   └── users.xml
├── xslt/            ← XSLT STYLESHEETS
│   ├── messages.xslt
│   ├── tasks.xslt
│   └── logs.xslt
├── scripts/         ← AUTOMATION SCRIPTS
│   └── consumer.js
└── server.js        ← ENTRY POINT

frontend/
├── index.html       ← SINGLE PAGE APP
├── css/style.css    ← STYLES
├── js/app.js        ← FRONTEND LOGIC
└── assets/logo.png  ← BRANDING
```

---

## 3. MVC Architecture Diagram

```
CLIENT (Browser)
      │
      ▼
  [Routes Layer]  ←── Defines API endpoints, applies middleware
      │
      ▼
  [Controllers]   ←── Handles HTTP request/response logic
      │
      ▼
  [Models]        ←── Reads/writes/validates XML data files
      │
      ▼
  [XML Files]     ←── messages.xml, tasks.xml, logs.xml, users.xml
```

---

## 4. Message Flow Diagram

```
User types message in browser
        │
        ▼
  POST /api/messages  (REST API)
        │
        ▼
  MessageController.send()
        │
        ├──► MessageModel.create()  →  writes to messages.xml
        │
        ├──► brokerService.publishMessage('monkihub:messages', msg)
        │         │
        │         ▼
        │    Redis PubSub (or in-memory fallback)
        │         │
        │         ▼
        │    consumer.js (background script)
        │         │
        │         ▼
        │    LogModel.create()  →  writes to logs.xml
        │
        └──► socket.io emit('message:new', msg)
                  │
                  ▼
           All connected browsers update in real-time
```

---

## 5. Models

### UserModel
- `findAll()` — returns all users (without passwords)
- `findByUsername(username)` — finds a single user
- `create({ username, password, role, email })` — hashes password, writes to users.xml
- `validatePassword(username, password)` — bcrypt comparison for login

### TaskModel
- `findAll()` — returns all tasks
- `findByAssignee(username)` — filters tasks for a specific user
- `create({ title, description, assignee, status, priority, createdBy })` — validates and writes to tasks.xml
- `update(id, updates)` — updates allowed fields in tasks.xml
- `delete(id)` — removes task from tasks.xml

### MessageModel
- `findAll()` — returns all messages
- `findByRoom(room)` — filters by chat room
- `create({ sender, receiver, content, room })` — writes to messages.xml

### LogModel
- `findAll()` — returns all logs (reversed for newest-first)
- `create({ action, actor, detail })` — appends to logs.xml

---

## 6. Controllers

| Controller | Responsibility |
|---|---|
| authController | Login (JWT), Register, List users |
| taskController | CRUD tasks, emit Socket.IO events, log actions |
| messageController | Send/get messages, publish to broker, emit real-time |
| logController | Read-only log retrieval (admin only) |
| xmlController | Serve raw XML and XSLT-transformed HTML |

---

## 7. XML Processing

XML files are the system's database. The `xmlService.js` handles:

- **Reading**: `xml2js.Parser` parses XML files into JavaScript objects
- **Writing**: `xml2js.Builder` serializes JS objects back to XML
- **XSLT Transformation**: `xslt4node` applies `.xslt` stylesheets to XML files, producing HTML output for the frontend. Falls back to syntax-highlighted raw XML if the XSLT engine is unavailable.

---

## 8. Messaging System

- **Broker**: Redis PubSub on channel `monkihub:messages`
- **Fallback**: In-memory event emitter when Redis is not running
- **Real-time**: Socket.IO broadcasts new messages to all connected clients in the same room
- **Rooms**: general, dev, design, announcements

---

## 9. XSLT Transformations

Three XSLT stylesheets transform XML data into HTML tables:

| Stylesheet | Input | Output |
|---|---|---|
| messages.xslt | messages.xml | HTML table of messages |
| tasks.xslt | tasks.xml | HTML table with status row coloring |
| logs.xslt | logs.xml | HTML table of activity logs |

Accessible via `GET /api/xml/transform/:file` (authenticated).

---

## 10. Script Integration

`scripts/consumer.js` is a standalone Node.js background script that:

1. Connects to Redis and subscribes to `monkihub:messages`
2. On each message received, logs it to `logs.xml` via `LogModel`
3. If Redis is unavailable, runs a simulation with 5 sample messages

**Run it:**
```bash
cd monkihub-backend
node scripts/consumer.js
```

---

## 11. User Roles

| Role | Permissions |
|---|---|
| admin | Create/edit/delete tasks, view logs, send messages, view XML |
| user | View assigned tasks, send messages, view XML |

---

## 12. API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/auth/login | No | Login, returns JWT |
| POST | /api/auth/register | No | Register new user |
| GET | /api/auth/users | Admin | List all users |
| GET | /api/tasks | Yes | Get tasks (filtered by role) |
| POST | /api/tasks | Admin | Create task |
| PUT | /api/tasks/:id | Admin | Update task |
| DELETE | /api/tasks/:id | Admin | Delete task |
| GET | /api/messages | Yes | Get messages (filter by ?room=) |
| POST | /api/messages | Yes | Send message |
| GET | /api/logs | Admin | Get activity logs |
| GET | /api/xml/raw/:file | Yes | Get raw XML file |
| GET | /api/xml/transform/:file | Yes | Get XSLT-transformed HTML |

---

## 13. Setup & Running

### Prerequisites
- Node.js v18+
- Redis (optional — system works without it)

### Install & Start Backend
```bash
cd backend
npm install
npm start
```

### Run Consumer Script
```bash
cd backend
node scripts/consumer.js
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

## 14. Challenges & Solutions

| Challenge | Solution |
|---|---|
| No traditional DB | Used XML files with xml2js for full CRUD |
| Redis not always available | Implemented in-memory queue fallback in brokerService |
| XSLT engine dependency | Added HTML fallback renderer in xmlService |
| Real-time without polling | Socket.IO with room-based broadcasting |
| Role-based access | JWT middleware + requireAdmin guard on routes |
