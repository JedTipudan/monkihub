# 🐒 MonkiHub

A full-stack team collaboration and task management platform built with Node.js (Express), vanilla HTML/CSS/JS, XML data storage, Socket.IO for real-time messaging, and **Apache Kafka (Redpanda)** as the message broker.

**🌐 Live Demo**: [Your Render URL Here]

---

## 🎯 Project Overview

MonkiHub is a comprehensive VA (Virtual Assistant) management platform designed for managers and remote teams. It enables:
- Real-time task assignment and tracking
- Direct messaging powered by **Apache Kafka** message broker
- Proof-of-work submission and approval workflow
- Payment request and processing system
- Automated background scripts for notifications and reporting
- Mobile-responsive design for on-the-go access

**Target Users**: Managers/Admins and Virtual Assistants

---

## ✨ Key Features

### 🔔 Real-Time Messaging with Kafka
- Direct messaging between users via **Apache Kafka** broker
- Messages published to Kafka topic → consumer processes → delivers via Socket.IO
- **If consumer is stopped → messages are NOT delivered** (demonstrates broker dependency)
- Live notification system (bell icon + banners)
- Unread message tracking per user
- Mobile-friendly notification banners

### 📋 Task Management
- Kanban board (To Do, In Progress, Pending Review)
- Task assignment with reference image upload
- Task due dates with calendar visualization
- Proof-of-work submission system
- Admin approval/rejection workflow with reason
- Approval history panel for completed tasks
- Priority levels (High, Medium, Low)
- Visual task status indicators and due date badges

### 💰 Payment System
- Payment request submission (GCash, Maya, Bank Transfer, PayPal)
- Admin approval with proof of payment upload
- Payment history tracking
- Task completion statistics per user

### ⚙️ Background Scripts
- **Consumer**: Kafka topic subscriber — saves and delivers messages
- **Notifier**: Auto-notification for new tasks
- **Archiver**: Auto-archive old data (7+ days)
- **Reporter**: HTML report generator with live file watching
- **Script Manager**: Start/stop scripts from UI with live logs

### 🗂️ XML Data Management
- XML-based data storage (users, tasks, messages, payments, logs)
- XSLT transformations for HTML display
- XML Viewer panel (raw + transformed views)
- DOM parsing with xml2js

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
- Admin user creation from UI (Super Admin only)
- `/auth/list` endpoint accessible to all authenticated users (for chat)

### 📅 Calendar & Scheduling
- Visual calendar with task due dates
- Color-coded task status (overdue, due soon, on track, completed)
- Monthly view with navigation
- Quick task overview on calendar dates
- Due date tracking and alerts
- Upcoming due dates widget on dashboard

### 🛡️ Security & DDoS Protection
- **Multi-layer rate limiting** (500 req/15min global, 60 req/min API)
- **Auto IP blacklisting** (50 failed attempts → 24hr ban)
- **Request size limits** (10MB max)
- **Suspicious pattern detection** (XSS, SQL injection, path traversal)
- **Security headers** (Helmet.js — CSP, HSTS, XSS protection)
- **CSP `script-src-attr`** allows inline event handlers (`onclick`, `oninput`, etc.)
- **Socket.IO connection limits** (10 per IP)
- **Password strength validation** with real-time indicator (min. fair strength required)
- **Failed login tracking** with automatic lockout

### 🔑 Password Strength Validation
- Real-time strength meter (Weak / Fair / Good / Strong)
- Requirements checklist (8+ chars, uppercase, lowercase, number, special char)
- Password confirmation field with match indicator
- Toggle password visibility button
- Applied on registration and profile update
- Minimum **fair** strength (3/5 criteria) required to submit

---

## Project Structure

```
MonkiHub/
├── backend/
│   ├── controllers/          # Request handlers
│   │   ├── authController.js
│   │   ├── taskController.js
│   │   ├── messageController.js
│   │   ├── paymentController.js
│   │   ├── scriptController.js
│   │   ├── logController.js
│   │   └── xmlController.js
│   ├── models/               # Data models (XML operations)
│   │   ├── UserModel.js
│   │   ├── TaskModel.js
│   │   ├── MessageModel.js
│   │   ├── PaymentModel.js
│   │   └── LogModel.js
│   ├── routes/               # API routes
│   │   ├── authRoutes.js
│   │   ├── taskRoutes.js
│   │   ├── messageRoutes.js
│   │   ├── paymentRoutes.js
│   │   ├── scriptRoutes.js
│   │   ├── logRoutes.js
│   │   └── xmlRoutes.js
│   ├── services/             # Business logic
│   │   ├── xmlService.js      # XML read/write + admin seed
│   │   └── brokerService.js   # Kafka producer (Redpanda)
│   ├── middleware/           # Auth & Security middleware
│   │   ├── auth.js            # authenticate, requireAdmin, requireSuperAdmin
│   │   ├── rateLimiter.js     # 8 rate limiter configurations
│   │   └── security.js        # Helmet CSP, HPP, IP blacklist, pattern detection
│   ├── data/                 # XML data storage
│   │   ├── users.xml          # ✅ Tracked in Git (accounts persist on deploy)
│   │   ├── tasks.xml
│   │   ├── messages.xml
│   │   ├── payments.xml
│   │   ├── logs.xml
│   │   ├── archive.xml
│   │   └── report.html
│   ├── xslt/                 # XSLT transformation files
│   │   ├── messages.xslt
│   │   ├── tasks.xslt
│   │   └── logs.xslt
│   ├── scripts/              # Background automation scripts
│   │   ├── consumer.js        # Kafka consumer — saves & delivers messages
│   │   ├── notifier.js        # Auto task notifications
│   │   ├── archiver.js        # Auto data archiving
│   │   └── reporter.js        # HTML report generator
│   ├── createAdmin.js        # Admin user creation script
│   ├── promoteToAdmin.js     # User promotion script
│   ├── makeSuperAdmin.js     # Upgrade user to Super Admin
│   ├── resetAdminPassword.js # Reset admin password
│   ├── server.js             # Main server file
│   ├── .env                  # Environment variables (not committed)
│   └── package.json
├── frontend/
│   ├── index.html            # Main app interface
│   ├── landing.html          # Landing/recruitment page
│   ├── css/
│   │   ├── style.css          # Main app styles + password strength styles
│   │   └── landing.css        # Landing page styles
│   ├── js/
│   │   ├── app.js             # Main app logic
│   │   └── landing.js         # Landing page logic
│   └── assets/
│       └── logo.png
├── .gitignore
├── package.json              # Root package.json for deployment
└── README.md
```

---

## Setup & Running

### Prerequisites
- Node.js v18+
- Redpanda Cloud account (free) — or any Kafka-compatible broker
- Git (for deployment)

### Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/monkihub.git
cd monkihub

# Install backend dependencies
cd backend
npm install

# Configure environment variables
cp .env.example .env
# Fill in your Kafka credentials in .env

# Start the server
node -r dotenv/config server.js
```

### Start the Kafka Consumer (Required for Chat)

Open a **second terminal**:
```bash
cd backend
node -r dotenv/config scripts/consumer.js
```

> ⚠️ **Chat will NOT work without the consumer running.** This is by design — it demonstrates the Kafka producer-consumer pattern.

Server runs on `http://localhost:3000`

### Environment Variables

Create `backend/.env`:
```
PORT=3000
JWT_SECRET=your_secret_key_here

# Redpanda / Kafka
KAFKA_BROKER=your-broker.redpanda.com:9092
KAFKA_USERNAME=your-username
KAFKA_PASSWORD=your-password
KAFKA_TOPIC=monkihub_messages

# Server URL (for consumer Socket.IO connection)
SERVER_URL=http://localhost:3000
```

### Default Credentials

| Username | Password | Role |
|---|---|---|
| admin | admin | Super Admin |

---

## 🚀 Deployment

### Data Persistence on Render

- `users.xml` is **tracked in Git** — user accounts persist across deploys
- `tasks.xml`, `messages.xml`, `payments.xml`, `logs.xml` are excluded from Git and reset on each deploy
- To persist all data, use Render's **persistent disk** (paid feature)

### Deploy to Render (Free)

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/monkihub.git
   git push -u origin main
   ```

2. **Deploy on Render**:
   - Go to https://render.com
   - Sign up with GitHub
   - Click **New +** → **Web Service**
   - Connect your repository
   - Configure:
     - **Name**: monkihub
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Instance Type**: Free
   - Click **Create Web Service**

3. **Add Environment Variables on Render**:
   - Go to your service → **Environment** tab
   - Add all variables from `.env`:
     - `KAFKA_BROKER`
     - `KAFKA_USERNAME`
     - `KAFKA_PASSWORD`
     - `KAFKA_TOPIC`
     - `SERVER_URL` → your Render URL (e.g. `https://monkihub.onrender.com`)
     - `JWT_SECRET`

4. **Keep it Online 24/7** (Optional):
   - Sign up at https://uptimerobot.com
   - Add HTTP monitor with your Render URL
   - Set interval to 5 minutes

---

## 🔥 Kafka Message Flow

```
User sends message
       ↓
POST /api/messages
       ↓
Published to Kafka topic (monkihub_messages)
       ↓
consumer.js reads from Kafka topic
       ↓
Saves message to messages.xml
       ↓
Emits via Socket.IO → receiver sees message
```

### Demo Concept (For Presentation)

| Consumer Status | Chat Works? |
|---|---|
| ✅ Running | Messages delivered in real-time |
| ❌ Stopped | Messages NOT delivered |

**Stop the consumer** from Script Manager → try sending a message → nothing appears.  
**Start the consumer** → messages flow again. ✅

This demonstrates the **producer-consumer pattern** used in real-world systems like Slack, WhatsApp, and Discord.

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
| GET | /api/messages | Yes | Get messages |
| GET | /api/messages/conversation/:user | Yes | Get conversation with a user |
| POST | /api/messages | Yes | Publish message to Kafka |

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

## Background Scripts

### consumer.js — Kafka Message Consumer ⭐
Subscribes to the Kafka topic `monkihub_messages`. For each message received:
1. Saves to `messages.xml`
2. Delivers to users via Socket.IO

**⚠️ Chat requires this script to be running.**
```bash
cd backend
node -r dotenv/config scripts/consumer.js
```

### notifier.js — Auto Notifier
Polls `tasks.xml` every 5 seconds. Sends system messages when new tasks are created or completed.
```bash
node -r dotenv/config scripts/notifier.js
```

### archiver.js — Auto Archiver
Moves tasks and messages older than 7 days into `archive.xml`.
```bash
node -r dotenv/config scripts/archiver.js
```

### reporter.js — Report Generator
Generates an HTML summary report at `data/report.html` with task stats, payroll data, and activity. Includes file watcher for auto-regeneration.
```bash
node -r dotenv/config scripts/reporter.js
```

---

## 👥 User Management

### Super Admin System

MonkiHub uses a **Super Admin** role hierarchy:

| Role | Create Admins | Manage Tasks | Delete Users | View Logs |
|---|---|---|---|---|
| **Super Admin** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Admin** | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |
| **User** | ❌ No | ❌ No | ❌ No | ❌ No |

### Create Admin from Website (Super Admin Only)

1. Login as **Super Admin** (`admin`)
2. Go to **Scripts Panel** → **User Manager** → **Start**
3. Fill in the **"➕ Create New Admin"** form
4. Click **"Create Admin"**

### Create Admin via Script
```bash
cd backend
node createAdmin.js <username> <password> [email]
```

### Upgrade to Super Admin
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

## Technologies Used

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time bidirectional communication
- **KafkaJS** - Apache Kafka client
- **xml2js** - XML parsing (DOM-based)
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **uuid** - Unique ID generation
- **socket.io-client** - Consumer connects back to server
- **express-rate-limit** - Rate limiting middleware
- **express-slow-down** - Gradual speed limiting
- **helmet** - Security headers (CSP, HSTS, XSS)
- **hpp** - HTTP Parameter Pollution protection

### Frontend
- **Vanilla JavaScript** - No frameworks
- **HTML5/CSS3** - Modern web standards
- **Socket.IO Client** - Real-time updates

### Message Broker
- **Apache Kafka** (via Redpanda Cloud) - Message broker
- **Redpanda** - Kafka-compatible serverless broker (free tier)
- **Topic**: `monkihub_messages`
- **Producer**: `messageController.js`
- **Consumer**: `scripts/consumer.js`

### Data & Transformation
- **XML** - Primary data storage format
- **XSLT** - XML to HTML transformations
- **JSON** - API communication

### Deployment
- **Render** - Cloud hosting platform
- **UptimeRobot** - Uptime monitoring
- **Git/GitHub** - Version control

---

## Course Requirements Compliance

### ✅ Messaging System (Kafka)
- Apache Kafka producer-consumer pattern
- Messages published to Kafka topic `monkihub_messages`
- Consumer subscribes, processes, and delivers messages
- Chat breaks when consumer is stopped (demonstrates broker dependency)
- Socket.IO for real-time delivery after Kafka processing
- Notification system with bell icon and banners

### ✅ XML Data Handling
- 6 XML files (users, tasks, messages, payments, logs, archive)
- Structured with meaningful tags and hierarchy
- Data validity and organization maintained

### ✅ XML Parsing (DOM)
- DOM parsing using xml2js library
- Read and extract data from XML files
- Display parsed data in web interface
- CRUD operations on XML data

### ✅ XSL/XSLT Transformations
- 3 XSLT files (messages, tasks, logs)
- Transform XML to HTML for web display
- Proper styling and formatting
- XML Viewer panel with raw and transformed views

### ✅ Scripting Languages (Node.js)
- 4 automation scripts (consumer, notifier, archiver, reporter)
- Background services and monitoring
- System automation and logging
- Script Manager for UI control

### ✅ Web Deployment
- Deployed on Render (accessible online)
- All features functional in production
- 24/7 uptime with UptimeRobot

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Browser    │  │    Mobile    │  │   Desktop    │      │
│  │  (HTML/CSS)  │  │   (Safari)   │  │   (Chrome)   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                    HTTP/WebSocket (Socket.IO)
                             │
┌────────────────────────────┴─────────────────────────────────┐
│                      Application Layer                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Node.js + Express Server                  │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │  │
│  │  │   Auth   │  │  Tasks   │  │ Messages │            │  │
│  │  │Controller│  │Controller│  │Controller│  + more    │  │
│  │  └──────────┘  └──────────┘  └──────────┘            │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────┬───────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
┌─────────────▼──────────┐   ┌───────────▼────────────┐
│   Apache Kafka Broker  │   │   Background Scripts   │
│  ┌──────────────────┐  │   │  ┌──────────────────┐  │
│  │  Redpanda Cloud  │  │   │  │   Consumer.js    │  │
│  │  (Kafka-compat.) │  │   │  │   Notifier.js    │  │
│  │  Topic:          │  │   │  │   Archiver.js    │  │
│  │  monkihub_msgs   │  │   │  │   Reporter.js    │  │
│  └──────────────────┘  │   │  └──────────────────┘  │
└────────────────────────┘   └───────────────────────┘
                                        │
┌───────────────────────────────────────▼───────────────┐
│                    Data Layer                          │
│  ┌──────────────────────────────────────────────────┐ │
│  │              XML Data Storage                    │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │ │
│  │  │users.xml │  │tasks.xml │  │messages  │      │ │
│  │  │(in Git)  │  │          │  │  .xml    │      │ │
│  │  └──────────┘  └──────────┘  └──────────┘      │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │ │
│  │  │payments  │  │ logs.xml │  │archive   │      │ │
│  │  │  .xml    │  └──────────┘  │  .xml    │      │ │
│  │  └──────────┘                └──────────┘      │ │
│  └──────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────┐ │
│  │           XSLT Transformations                   │ │
│  │  messages.xslt │ tasks.xslt │ logs.xslt         │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

---

## Contributing

This is an academic project. Contributions are welcome for educational purposes.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## License

This project is created for educational purposes as part of a Web-Based Systems course.

---

## Acknowledgments

- Built as a final project for Web-Based Systems course
- Demonstrates Apache Kafka producer-consumer pattern, XML processing, XSLT transformations, and automation scripting
- Special thanks to all team members who contributed to this project

---

**Made with ❤️ by the MonkiHub Team**
