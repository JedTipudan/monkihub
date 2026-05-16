# 🐒 MonkiHub

A full-stack team collaboration and task management platform built with Node.js (Express), vanilla HTML/CSS/JS, XML data storage, Socket.IO for real-time messaging, and **Apache Kafka** as the embedded message broker.

**🌐 Live Demo**: [Your Render URL Here]  
**📦 Repository**: https://github.com/JedTipudan/monkihub

---

## 🚀 How to Run (Step by Step)

### Prerequisites — Install These First

| Tool | Why | Download |
|---|---|---|
| **Node.js v18+** | Runs the backend server | https://nodejs.org |
| **Docker Desktop** | Runs local Kafka broker | https://www.docker.com/products/docker-desktop |
| **Git** | Clone the repo | https://git-scm.com |

> Check versions: `node -v` should show `v18.x.x` or higher. `docker -v` should show a version number.

---

### Step 1 — Clone the Repository

Open a terminal (VS Code terminal, Command Prompt, or PowerShell):

```bash
git clone https://github.com/JedTipudan/monkihub.git
cd monkihub
```

---

### Step 2 — Install Dependencies

```bash
cd backend
npm install
```

This installs all backend packages (Express, KafkaJS, Socket.IO, xml2js, etc.).

---

### Step 3 — Set Up Environment Variables

Create the file `backend/.env` with the following content:

```env
PORT=3000
JWT_SECRET=your_secret_key_here

# Local Kafka (Docker) — leave USERNAME and PASSWORD blank for local
KAFKA_BROKER=localhost:9092
KAFKA_USERNAME=
KAFKA_PASSWORD=
KAFKA_TOPIC=monkihub_messages

# Server URL
SERVER_URL=http://localhost:3000

# Cloudinary — for image uploads (get free account at cloudinary.com)
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

> If you skip Cloudinary, image uploads (avatars, task proofs, payment proofs) will not work but everything else will.

---

### Step 4 — Start Kafka (One-Time Setup)

Make sure **Docker Desktop is running** (whale icon in system tray), then run:

```bash
# From the project root (monkihub/)
setup-kafka-docker.bat
```

This pulls and starts a local Kafka broker in Docker. Takes about 1–2 minutes the first time.

Then configure it for localhost:

```bash
configure-local-kafka.bat
```

> You only need to do Steps 4 once. After that, Docker remembers the Kafka container.

---

### Step 5 — Start the Server

Open a terminal in the `backend/` folder:

```bash
cd backend
node -r dotenv/config server.js
```

You should see:

```
============================================================
🐒 MonkiHub Backend Server
============================================================
✅ Server running on port 3000
✅ Embedded message consumer ready (in-memory mode)
...
```

---

### Step 6 — Open the App

Open your browser and go to:

```
http://localhost:3000
```

Login with the default Super Admin account:

| Username | Password | Role |
|---|---|---|
| `admin` | `admin` | Super Admin |

---

### Daily Usage (After First Setup)

Every day you just need **one command** from the project root:

```bash
start-all-offline.bat
```

This starts Docker Kafka + the backend server automatically.

Then open `http://localhost:3000`.

---

### Running via VS Code Terminal

1. Open VS Code
2. Open the `monkihub` folder (`File → Open Folder`)
3. Open the terminal (`Ctrl + `` ` ``)
4. Run:

```bash
cd backend
node -r dotenv/config server.js
```

> The Kafka consumer is now **embedded inside the server** — you do NOT need a second terminal for it anymore. Just one terminal is enough.

---

### Troubleshooting

| Problem | Fix |
|---|---|
| `Cannot find module` error | Run `npm install` inside `backend/` |
| Port 3000 already in use | Kill the process: `npx kill-port 3000` |
| Kafka connection error | Make sure Docker Desktop is running, then run `test-kafka.bat` |
| Messages not delivering | The embedded consumer handles this automatically — just restart the server |
| Images not uploading | Check your Cloudinary credentials in `.env` |
| `admin` login not working | Run `node resetAdminPassword.js` inside `backend/` |

---

## 🎯 Project Overview

MonkiHub is a comprehensive VA (Virtual Assistant) management platform designed for managers and remote teams. It enables:

- Real-time task assignment and tracking
- Direct messaging powered by **Apache Kafka** (embedded broker — no separate consumer process needed)
- Proof-of-work submission and approval workflow
- Payment request and processing system
- Automated background scripts for notifications and reporting
- Message moderation with word filter, user banning, and bad word strike system
- Mobile-responsive design for on-the-go access

**Target Users**: Managers/Admins and Virtual Assistants

---

## ✨ Key Features

### 💬 Real-Time Messaging (Kafka — Embedded Consumer)
- Direct messaging between users via **Apache Kafka** broker
- Kafka consumer is **embedded inside the server** — no separate process needed
- Messages published to Kafka topic → embedded consumer saves → delivers via Socket.IO
- Falls back to in-memory broker automatically if Kafka is unavailable
- Live notification system (bell icon + banners)
- Unread message tracking per user — notifications only appear when chat is **not open**
- **5-second cooldown** between messages per user (enforced server-side + UI countdown)

### 🛡️ Message Moderation System
- **Word Filter** — bad words are replaced with `***` in all messages
  - Default list of 15+ profanity words pre-loaded
  - Super Admin can add/remove custom words from the Message Manager panel
  - Word list is **persisted to `data/bannedWords.json`** — survives server restarts
- **Bad Word Strike System**
  - Every message containing a banned word gives the sender **1 strike**
  - **Strike 1** → animated popup warning: `⚠️ Warning 1 of 3 — "word"`
  - **Strike 2** → popup warning: `⚠️ Warning 2 of 3 — "word"` (dots turn red)
  - **Strike 3** → **5-minute mute** applied automatically: `🔇 You are muted for 5 minutes`
  - Muted users cannot send messages — Send button shows live countdown (`Muted 4m 59s`)
  - Strikes reset to 0 after mute expires
- **User Ban** — Admin can permanently ban users from messaging
- Warning popups are centered, animated modals with:
  - Big emoji, word pill badge, strike dot indicators, progress bar drain
  - Auto-dismiss after 5s for strike warnings, manual dismiss for mute

### 📋 Task Management
- Kanban board (To Do, In Progress, Pending Review)
- Task assignment with reference image upload
- Task due dates with calendar visualization
- Proof-of-work submission system
- Admin approval/rejection workflow with reason
- Approval history panel for completed tasks
- Priority levels (High, Medium, Low)
- Visual task status indicators and due date badges

### 🔔 Task Assignment Notifications
- Assigned user receives an **instant bell notification + banner** when admin creates a task
- Notification is **targeted** — only the assignee is notified
- Shows task title, priority, and due date in the notification

### 💰 Payment System
- Payment request submission (GCash, Maya, Bank Transfer, PayPal)
- Admin approval with proof of payment upload
- Payment history tracking
- Task completion statistics per user

### ⚙️ Scripts Panel
- **Message Manager** — Ban/unban users + Word Filter management (Super Admin only)
- **Auto Notifier** — Polls tasks and sends system notifications
- **Auto Archiver** — Moves old data (7+ days) to `archive.xml`
- **Report Generator** — Generates HTML summary report with live file watching
- **User Manager** — Create/delete users from the UI (Super Admin: create admins)
- All scripts have a mini terminal log output in the UI

### 🗂️ XML Data Management
- XML-based data storage (users, tasks, messages, payments, logs)
- XSLT transformations for HTML display
- XML Viewer panel (raw + transformed views)
- DOM parsing with xml2js

### 📸 Cloud-Based Image Storage
- **Cloudinary integration** for scalable image storage
- Profile avatar, task proof, task reference, and payment proof uploads
- Automatic image optimization and CDN delivery
- Requires internet connection for uploads

### 📱 Mobile Responsive
- Hamburger menu navigation
- Touch-friendly interface
- Auto-closing sidebar
- Optimized for all screen sizes

### 👥 User Management
- **Super Admin** role — only Super Admin can create other admins
- Role-based access (Super Admin / Admin / User)
- User registration and authentication
- Profile management with avatar upload

### 📅 Calendar & Scheduling
- Visual calendar with task due dates
- Color-coded task status (overdue, due soon, on track, completed)
- Monthly view with navigation
- Upcoming due dates widget on dashboard

### 🔒 Security & DDoS Protection
- Multi-layer rate limiting (500 req/15min global, 60 req/min API)
- Auto IP blacklisting (50 failed attempts → 24hr ban)
- Request size limits (10MB max)
- Suspicious pattern detection (XSS, SQL injection, path traversal)
- Security headers (Helmet.js — CSP, HSTS, XSS protection)
- Socket.IO connection limits (10 per IP)
- Password strength validation with real-time indicator (min. fair strength required)

---

## Project Structure

```
MonkiHub/
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── taskController.js
│   │   ├── messageController.js   # Word filter, ban, strike/mute system
│   │   ├── paymentController.js
│   │   ├── scriptController.js    # Message Manager replaces consumer card
│   │   ├── logController.js
│   │   └── xmlController.js
│   ├── models/
│   │   ├── UserModel.js
│   │   ├── TaskModel.js
│   │   ├── MessageModel.js
│   │   ├── PaymentModel.js
│   │   └── LogModel.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── taskRoutes.js
│   │   ├── messageRoutes.js       # Ban + word filter routes added
│   │   ├── paymentRoutes.js
│   │   ├── scriptRoutes.js
│   │   ├── logRoutes.js
│   │   └── xmlRoutes.js
│   ├── services/
│   │   ├── xmlService.js
│   │   ├── brokerService.js       # Kafka producer + in-memory fallback
│   │   └── cloudinaryService.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── rateLimiter.js
│   │   └── security.js
│   ├── data/
│   │   ├── users.xml              # ✅ Tracked in Git
│   │   ├── tasks.xml
│   │   ├── messages.xml
│   │   ├── payments.xml
│   │   ├── logs.xml
│   │   ├── archive.xml
│   │   ├── bannedWords.json       # ✅ Tracked in Git — persisted word filter
│   │   └── report.html
│   ├── xslt/
│   │   ├── messages.xslt
│   │   ├── tasks.xslt
│   │   └── logs.xslt
│   ├── scripts/
│   │   ├── consumer.js            # Standalone consumer (kept for reference)
│   │   ├── notifier.js
│   │   ├── archiver.js
│   │   └── reporter.js
│   ├── server.js                  # Embedded Kafka consumer inside server
│   ├── .env
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── landing.html
│   ├── css/
│   │   ├── style.css              # Warning popup styles added
│   │   └── landing.css
│   ├── js/
│   │   ├── app.js                 # Strike/mute UI, message manager, notification fix
│   │   └── landing.js
│   └── assets/
│       └── logo.png
├── setup-kafka-docker.bat         # One-time Kafka setup
├── configure-local-kafka.bat      # Configure .env for localhost
├── start-all-offline.bat          # Daily start command
├── test-kafka.bat                 # Diagnose Kafka issues
├── .gitignore
├── package.json
└── README.md
```

---

## 🔥 Kafka Message Flow

```
User sends message
       ↓
Bad word check → filter content → strike/mute check
       ↓
POST /api/messages
       ↓
Published to Kafka topic (monkihub_messages)
       ↓
Embedded consumer inside server.js reads from topic
       ↓
Saves message to messages.xml
       ↓
Emits via Socket.IO → receiver sees message
(notification only fires if chat is NOT open)
```

> If Kafka is unavailable, the system automatically falls back to an in-memory broker. Messages still deliver in real-time — no manual intervention needed.

---

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/auth/login | No | Login, returns JWT |
| POST | /api/auth/register | No | Register new user |
| GET | /api/auth/list | Yes | List users (all authenticated) |
| GET | /api/auth/users | Admin | List all users with full details |
| POST | /api/auth/create-admin | Super Admin | Create new admin user |
| DELETE | /api/auth/users/:username | Admin | Delete user |
| GET | /api/auth/profile | Yes | Get own profile |
| PUT | /api/auth/profile | Yes | Update profile / change password |

### Tasks
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/tasks | Yes | Get tasks (filtered by role) |
| POST | /api/tasks | Admin | Create task |
| PUT | /api/tasks/:id | Admin | Update task / set due date |
| DELETE | /api/tasks/:id | Admin | Delete task |
| POST | /api/tasks/:id/submit | Yes | Submit proof of work |
| POST | /api/tasks/:id/approve | Admin | Approve task |
| POST | /api/tasks/:id/reject | Admin | Reject task with reason |

### Messages
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /api/messages | Yes | Get all messages |
| GET | /api/messages/conversation/:user | Yes | Get conversation with a user |
| POST | /api/messages | Yes | Send message (with filter + strike check) |
| GET | /api/messages/banned | Admin | Get list of banned users |
| POST | /api/messages/ban/:username | Admin | Ban user from messaging |
| POST | /api/messages/unban/:username | Admin | Unban user |
| GET | /api/messages/wordfilter | Super Admin | Get banned word list |
| POST | /api/messages/wordfilter | Super Admin | Add a banned word |
| DELETE | /api/messages/wordfilter/:word | Super Admin | Remove a banned word |

### Payments
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/payments | Yes | Submit payment request |
| GET | /api/payments | Admin | Get all payments |
| GET | /api/payments/mine | Yes | Get own payments |
| POST | /api/payments/:id/pay | Admin | Mark as paid |
| POST | /api/payments/:id/reject | Admin | Reject request |
| DELETE | /api/payments/:id | Admin | Delete record |

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

## 👥 User Management

### Role Hierarchy

| Role | Create Admins | Word Filter | Ban Users | Manage Tasks | Delete Users | View Logs |
|---|---|---|---|---|---|---|
| **Super Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Admin** | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| **User** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Create Admin from Website (Super Admin Only)
1. Login as Super Admin (`admin`)
2. Go to **Scripts Panel** → **User Manager** → **Start**
3. Fill in the **Create New Admin** form and click **Create Admin**

### Create Admin via Terminal
```bash
cd backend
node createAdmin.js <username> <password> [email]
```

### Upgrade User to Super Admin
```bash
cd backend
node makeSuperAdmin.js
```

### Reset Admin Password
```bash
cd backend
node resetAdminPassword.js
```

---

## 🚀 Deployment (Render)

### Data Persistence
- `users.xml` and `bannedWords.json` are **tracked in Git** — persist across deploys
- `tasks.xml`, `messages.xml`, `payments.xml`, `logs.xml` reset on each deploy
- For full persistence, use Render's **persistent disk** (paid feature)

### Deploy Steps

1. Push to GitHub:
```bash
git add .
git commit -m "deploy"
git push origin main
```

2. Go to https://render.com → **New +** → **Web Service** → connect your repo

3. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

4. Add Environment Variables in Render dashboard:
   - `KAFKA_BROKER`, `KAFKA_USERNAME`, `KAFKA_PASSWORD`, `KAFKA_TOPIC`
   - `JWT_SECRET`
   - `SERVER_URL` → your Render URL (e.g. `https://monkihub.onrender.com`)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

5. Keep alive 24/7 (optional): https://uptimerobot.com — monitor your Render URL every 5 minutes

---

## Technologies Used

### Backend
- **Node.js** — Runtime environment
- **Express.js** — Web framework
- **Socket.IO** — Real-time bidirectional communication
- **KafkaJS** — Apache Kafka client (embedded consumer)
- **Cloudinary** — Cloud-based image storage and CDN
- **xml2js** — XML parsing (DOM-based)
- **bcryptjs** — Password hashing
- **jsonwebtoken** — JWT authentication
- **uuid** — Unique ID generation
- **express-rate-limit** — Rate limiting
- **helmet** — Security headers (CSP, HSTS, XSS)
- **hpp** — HTTP Parameter Pollution protection

### Frontend
- **Vanilla JavaScript** — No frameworks
- **HTML5/CSS3** — Modern web standards
- **Socket.IO Client** — Real-time updates

### Message Broker
- **Apache Kafka** (via Redpanda Cloud or local Docker)
- **Embedded consumer** inside `server.js` — no separate process needed
- **Topic**: `monkihub_messages`
- **Producer**: `messageController.js`
- **Consumer**: embedded in `server.js` (falls back to in-memory if Kafka unavailable)

### Data & Transformation
- **XML** — Primary data storage format
- **XSLT** — XML to HTML transformations
- **JSON** — API communication + `bannedWords.json` persistence

### Deployment
- **Render** — Cloud hosting
- **UptimeRobot** — Uptime monitoring
- **Git/GitHub** — Version control

---

## Course Requirements Compliance

### ✅ Messaging System (Kafka)
- Apache Kafka producer-consumer pattern
- Messages published to Kafka topic `monkihub_messages`
- Embedded consumer subscribes, processes, and delivers messages
- Automatic fallback to in-memory broker if Kafka is unavailable
- Socket.IO for real-time delivery

### ✅ XML Data Handling
- 6 XML files (users, tasks, messages, payments, logs, archive)
- Structured with meaningful tags and hierarchy

### ✅ XML Parsing (DOM)
- DOM parsing using xml2js library
- CRUD operations on XML data

### ✅ XSL/XSLT Transformations
- 3 XSLT files (messages, tasks, logs)
- XML Viewer panel with raw and transformed views

### ✅ Scripting Languages (Node.js)
- 4 automation scripts (consumer, notifier, archiver, reporter)
- Script Manager for UI control with live terminal output

### ✅ Web Deployment
- Deployed on Render
- 24/7 uptime with UptimeRobot

---

## Changelog

### Latest Updates
- **Embedded Kafka Consumer** — consumer now runs inside the server automatically, no second terminal needed
- **Message Manager Panel** — replaces the old consumer script card; includes ban/unban users and word filter
- **Word Filter** — bad words replaced with `***`, list persisted to `bannedWords.json`
- **Bad Word Strike System** — 3 strikes = 5-minute mute, with animated popup warnings
- **Warning Popup** — centered modal with emoji, word pill badge, strike dots, and progress bar
- **Notification Fix** — notifications no longer fire when the conversation is already open
- **Duplicate Message Fix** — removed multiple subscriber registrations that caused messages to appear 3 times
- **5-Second Cooldown** — enforced server-side with live countdown on Send button

---

**Made with ❤️ by the MonkiHub Team**
