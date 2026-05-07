# 🐒 MonkiHub

A full-stack team collaboration and task management platform built with Node.js (Express), vanilla HTML/CSS/JS, XML data storage, Socket.IO for real-time messaging, and Redis (with in-memory fallback) as a message broker.

**🌐 Live Demo**: [Your Render URL Here]

---

## 🎯 Project Overview

MonkiHub is a comprehensive VA (Virtual Assistant) management platform designed for managers and remote teams. It enables:
- Real-time task assignment and tracking
- Direct messaging with live notifications
- Proof-of-work submission and approval workflow
- Payment request and processing system
- Automated background scripts for notifications and reporting
- Mobile-responsive design for on-the-go access

**Target Users**: Managers/Admins and Virtual Assistants

---

## ✨ Key Features

### 🔔 Real-Time Messaging & Notifications
- Direct messaging between users
- Live notification system (bell icon + banners)
- Socket.IO for instant updates
- Unread message tracking
- Mobile-friendly notifications

### 📋 Task Management
- Kanban board (To Do, In Progress, Pending Review, Done)
- Task assignment with reference images
- Proof-of-work submission system
- Admin approval/rejection workflow
- Task history tracking
- Priority levels (High, Medium, Low)

### 💰 Payment System
- Payment request submission (GCash, Maya, Bank Transfer, PayPal)
- Admin approval with proof of payment upload
- Payment history tracking
- Task completion statistics

### ⚙️ Background Scripts
- **Consumer**: Message broker subscriber with Redis/in-memory fallback
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
- Role-based access (Admin/User)
- User registration and authentication
- Profile management with avatar upload
- Admin user creation scripts

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
│   │   ├── xmlService.js      # XML read/write operations
│   │   └── brokerService.js   # Redis/in-memory message broker
│   ├── middleware/           # Auth middleware
│   │   └── auth.js
│   ├── data/                 # XML data storage
│   │   ├── users.xml
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
│   │   ├── consumer.js        # Message broker consumer
│   │   ├── notifier.js        # Auto task notifications
│   │   ├── archiver.js        # Auto data archiving
│   │   └── reporter.js        # HTML report generator
│   ├── createAdmin.js        # Admin user creation script
│   ├── promoteToAdmin.js     # User promotion script
│   ├── server.js             # Main server file
│   └── package.json
├── frontend/
│   ├── index.html            # Main app interface
│   ├── landing.html          # Landing/recruitment page
│   ├── css/
│   │   ├── style.css          # Main app styles
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
- Redis (optional — system works without it with in-memory fallback)
- Git (for deployment)

### Local Development

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/monkihub.git
cd monkihub

# Install backend dependencies
cd backend
npm install

# Start the server
npm start
```

Server runs on `http://localhost:3000`

### Open Frontend

Open `http://localhost:3000` in your browser (landing page)  
Or go to `http://localhost:3000/index.html` (main app)

### Default Credentials

| Username | Password | Role |
|---|---|---|
| admin | password123 | Admin |
| alice | password123 | User |
| bob | password123 | User |

---

## 🚀 Deployment

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

3. **Keep it Online 24/7** (Optional):
   - Sign up at https://uptimerobot.com
   - Add HTTP monitor with your Render URL
   - Set interval to 5 minutes
   - This prevents the free tier from sleeping

### Environment Variables (Optional)

```
PORT=3000
JWT_SECRET=your_secret_key_here
REDIS_URL=redis://your-redis-url (optional)
```

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
cd backend
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
Reads all XML data and generates an HTML summary report at `data/report.html` with task stats, per-user breakdowns, payment data, and recent activity. Includes file watcher for auto-regeneration on data changes.
```bash
node scripts/reporter.js
```

---

## 👥 User Management

### Create Admin User

**Method 1: Command Line Script**
```bash
cd backend
node createAdmin.js <username> <password> [email]

# Example:
node createAdmin.js manager password123 manager@company.com
```

**Method 2: Promote Existing User**
```bash
cd backend
node promoteToAdmin.js <username>

# Example:
node promoteToAdmin.js alice
```

**Method 3: API Endpoint**
```bash
POST /api/auth/create-admin
Headers: Authorization: Bearer <admin_token>
Body: {
  "username": "newadmin",
  "password": "securepass",
  "email": "admin@company.com"
}
```

### Delete User

Admins can delete users through:
- Script Manager → User Manager panel
- API: `DELETE /api/auth/users/:username`

---

## User Roles

| Role | Permissions |
|---|---|
| admin | Create/edit/delete tasks, view logs, send messages, manage payments, run scripts, view XML, create admins, delete users |
| user | View assigned tasks, send messages, submit payment requests, view own payments, submit proof of work |

---

## Key Features

- **XML as database** — All data stored in XML files, managed via `xml2js`
- **XSLT transformations** — `messages.xslt`, `tasks.xslt`, `logs.xslt` render XML as HTML tables
- **Real-time** — Socket.IO broadcasts task, message, and payment events to all connected clients
- **Payment system** — Users submit payment requests; admins approve/reject with optional proof of payment
- **Script Manager** — Admins can start/stop/monitor background scripts from the UI with live log streaming
- **Redis broker** — PubSub on `monkihub:messages` with in-memory fallback
- **JWT auth** — Stateless authentication with role-based middleware guards
- **Mobile responsive** — Hamburger menu, touch-friendly interface, auto-closing sidebar
- **Notification system** — Real-time bell notifications and banners for messages and tasks
- **File uploads** — Task reference images and proof of work stored as base64

---

## Technologies Used

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time bidirectional communication
- **xml2js** - XML parsing (DOM-based)
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **ioredis** - Redis client (optional)
- **uuid** - Unique ID generation

### Frontend
- **Vanilla JavaScript** - No frameworks
- **HTML5/CSS3** - Modern web standards
- **Socket.IO Client** - Real-time updates

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

This project fulfills all requirements for the Web-Based Systems course:

### ✅ Messaging System
- Real-time chat with Socket.IO
- Message broker (Redis/in-memory)
- Notification system
- Background message consumer

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
│   Message Broker       │   │   Background Scripts   │
│  ┌──────────────────┐  │   │  ┌──────────────────┐  │
│  │ Redis (optional) │  │   │  │   Consumer.js    │  │
│  │   or In-Memory   │  │   │  │   Notifier.js    │  │
│  │     PubSub       │  │   │  │   Archiver.js    │  │
│  └──────────────────┘  │   │  │   Reporter.js    │  │
└────────────────────────┘   │  └──────────────────┘  │
                             └───────────────────────┘
                                        │
┌───────────────────────────────────────▼───────────────┐
│                    Data Layer                          │
│  ┌──────────────────────────────────────────────────┐ │
│  │              XML Data Storage                    │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │ │
│  │  │users.xml │  │tasks.xml │  │messages  │      │ │
│  │  └──────────┘  └──────────┘  │  .xml    │      │ │
│  │  ┌──────────┐  ┌──────────┐  └──────────┘      │ │
│  │  │payments  │  │ logs.xml │  ┌──────────┐      │ │
│  │  │  .xml    │  └──────────┘  │archive   │      │ │
│  │  └──────────┘                 │  .xml    │      │ │
│  │                               └──────────┘      │ │
│  └──────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────┐ │
│  │           XSLT Transformations                   │ │
│  │  messages.xslt │ tasks.xslt │ logs.xslt         │ │
│  └──────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

---

## API Documentation

For complete API documentation, see the API Endpoints section in the original README.

Key endpoints:
- `POST /api/auth/login` - User authentication
- `POST /api/auth/create-admin` - Create admin user
- `GET /api/tasks` - Get tasks
- `POST /api/messages` - Send message
- `POST /api/payments` - Submit payment request
- `GET /api/scripts/status` - Get script status
- `GET /api/xml/transform/:file` - Transform XML to HTML

---

## Screenshots

### Landing Page
![Landing Page](docs/screenshots/landing.png)

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Task Board (Kanban)
![Task Board](docs/screenshots/tasks.png)

### Real-Time Chat
![Chat](docs/screenshots/chat.png)

### Notifications
![Notifications](docs/screenshots/notifications.png)

### Payment System
![Payments](docs/screenshots/payments.png)

### Script Manager
![Scripts](docs/screenshots/scripts.png)

### XML Viewer
![XML Viewer](docs/screenshots/xml-viewer.png)

### Mobile View
![Mobile](docs/screenshots/mobile.png)

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
- Demonstrates integration of messaging systems, XML processing, XSLT transformations, and automation scripting
- Special thanks to all team members who contributed to this project

---

## Contact & Support

For questions or issues:
- Open an issue on GitHub
- Contact the development team

---

**Made with ❤️ by the MonkiHub Team**
