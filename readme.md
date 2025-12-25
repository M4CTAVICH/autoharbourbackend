# AutoHarbour Backend API

A comprehensive backend API for AutoHarbour - a marketplace platform for buying and selling vehicles and automotive parts.

## 🚀 Features

### Core Functionality

- **Authentication & Authorization**: JWT-based auth with role management (User, Admin)
- **User Profiles**: Public and private profile management with verification system
- **Listings Management**: Create, update, delete, and search vehicle listings
- **Categories**: Hierarchical category system for organizing listings
- **Messaging**: Real-time chat between buyers and sellers via Socket.IO
- **Favorites**: Save and manage favorite listings
- **Search**: Advanced search with Elasticsearch integration
- **File Upload**: Cloudinary integration for images (listings and profiles)
- **Notifications**: Real-time notifications system
- **Reports**: User-generated content reporting system
- **Admin Panel**: Comprehensive admin dashboard with user management

### Real-Time Features

- WebSocket-based messaging
- Typing indicators
- Read receipts
- Online/offline status
- Real-time notifications

## 🛠️ Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.IO
- **Search**: Elasticsearch
- **File Storage**: Cloudinary
- **Authentication**: JWT with bcrypt
- **Email**: Nodemailer (SMTP)
- **Security**: Helmet, CORS, Rate Limiting

## 📋 Prerequisites

- Node.js (v18+)
- PostgreSQL
- Elasticsearch (optional, for advanced search)
- Cloudinary account
- SMTP server credentials

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=5000
NODE_ENV=development

# URLs
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:5000
FRONTEND_URL_WWW=http://www.localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/autoharbour

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Elasticsearch (optional)
ELASTICSEARCH_URL=http://localhost:9200
```

## 🚦 Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd autoharbourbackend
```

2. **Install dependencies**

```bash
npm install
```

3. **Setup database**

```bash
npx prisma generate
npx prisma migrate dev
```

4. **Start the server**

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## 📡 API Endpoints

### Authentication (`/api/auth`)

- `POST /register` - Register new user
- `POST /login` - User login
- `POST /verify-email` - Verify email with OTP
- `POST /forgot-password` - Request password reset
- `POST /verify-password-reset` - Verify OTP for password reset
- `POST /reset-password` - Reset password
- `GET /profile` - Get current user profile (protected)
- `PUT /profile` - Update profile (protected)
- `PUT /change-password` - Change password (protected)
- `PUT /update-email` - Update email (protected)
- `POST /logout` - Logout (protected)

### Categories (`/api/categories`)

- `GET /` - Get all categories
- `GET /tree` - Get category tree structure
- `GET /root` - Get root categories
- `GET /search` - Search categories
- `GET /slug/:slug` - Get category by slug
- `GET /:id` - Get category by ID
- `POST /` - Create category (admin)
- `PUT /:id` - Update category (admin)
- `DELETE /:id` - Delete category (admin)

### Listings (`/api/listings`)

- `GET /` - Get all listings with filters
- `GET /:id` - Get listing details
- `POST /` - Create listing (protected)
- `PUT /:id` - Update listing (protected)
- `DELETE /:id` - Delete listing (protected)

### Profile (`/api/profile`)

- `GET /me` - Get own profile (protected)
- `PUT /me` - Update own profile (protected)
- `PUT /me/password` - Change password (protected)
- `DELETE /me/deactivate` - Deactivate account (protected)
- `GET /me/listings` - Get own listings (protected)
- `GET /public/:userId` - Get public profile
- `GET /public/:userId/listings` - Get user's listings
- `GET /public/:userId/stats` - Get user statistics

### Messaging (`/api/messages`)

- `POST /` - Send message (protected)
- `GET /conversations` - Get all conversations (protected)
- `GET /user/:userId` - Get messages with specific user (protected)
- `PATCH /user/:userId/read` - Mark messages as read (protected)
- `GET /unread-count` - Get unread message count (protected)
- `DELETE /:messageId` - Delete message (protected)

### Favorites (`/api/favorites`)

- `POST /` - Add to favorites (protected)
- `DELETE /:listingId` - Remove from favorites (protected)
- `GET /` - Get all favorites (protected)

### Upload (`/api/upload`)

- `POST /listing-images` - Upload listing images (protected, max 5)
- `POST /profile-image` - Upload profile image (protected)
- `DELETE /listing/:listingId/image` - Delete listing image (protected)
- `DELETE /profile-image` - Delete profile image (protected)
- `GET /usage-stats` - Get storage usage stats (admin)

### Search (`/api/search`)

- Advanced search functionality with filters
- Location-based search
- Price range filtering
- Category filtering

### Reports (`/api/reports`)

- `POST /` - Submit report (protected)
- `GET /my-reports` - Get user's reports (protected)
- `GET /:reportId` - Get report details (protected)

### Notifications (`/api/notifications`)

- Real-time notification system
- Mark as read functionality
- Notification preferences

### Admin (`/api/admin`)

- `GET /dashboard` - Dashboard statistics (admin)
- `GET /users` - Get all users with filters (admin)
- `POST /users/:userId/ban` - Ban user (admin)
- `POST /users/:userId/unban` - Unban user (admin)
- `GET /reports` - Get all reports (admin)

## 🔌 WebSocket Events

### Messaging

```typescript
// Client → Server
socket.emit("join_conversation", { otherUserId: number });
socket.emit("send_message", {
  content: string,
  receiverId: number,
  listingId: number,
});
socket.emit("typing_start", { receiverId: number });
socket.emit("typing_stop", { receiverId: number });
socket.emit("mark_messages_read", { fromUserId: number });

// Server → Client
socket.on("new_message", (message) => {});
socket.on("message_sent", (message) => {});
socket.on("user_typing", (data) => {});
socket.on("user_stopped_typing", (data) => {});
socket.on("message_error", (error) => {});
```

### Notifications

```typescript
// Client → Server
socket.emit("mark_notification_read", notificationId);
socket.emit("mark_all_notifications_read");

// Server → Client
socket.on("new_notification", (notification) => {});
socket.on("notification_marked_read", (data) => {});
socket.on("unread_count_update", (count) => {});
```

## 🏗️ Project Structure

```
autoharbourbackend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── db.ts        # Prisma client
│   │   └── env.ts       # Environment variables
│   ├── controller/       # Request handlers
│   │   ├── authController.ts
│   │   ├── profileController.ts
│   │   ├── messagingController.ts
│   │   ├── adminController.ts
│   │   └── ...
│   ├── services/         # Business logic
│   │   ├── authService.ts
│   │   ├── profileService.ts
│   │   ├── messagingService.ts
│   │   ├── adminService.ts
│   │   └── notificationService.ts
│   ├── routes/           # API routes
│   │   ├── auth.ts
│   │   ├── profile.ts
│   │   ├── messaging.ts
│   │   ├── admin.ts
│   │   └── index.ts
│   ├── middlewares/      # Custom middlewares
│   │   ├── authMiddleware.ts
│   │   └── errorHandler.ts
│   ├── sockets/          # WebSocket handlers
│   │   ├── messagingSockets.ts
│   │   └── notificationSocket.ts
│   ├── utils/            # Utility functions
│   │   ├── cloudinary.ts
│   │   └── email.ts
│   ├── types/            # TypeScript types
│   │   ├── profile.d.ts
│   │   ├── message.d.ts
│   │   ├── listing.d.ts
│   │   └── ...
│   └── app.ts            # Express app setup
├── prisma/
│   └── schema.prisma     # Database schema
├── index.ts              # Server entry point
├── package.json
└── tsconfig.json
```

## 🔐 Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Helmet**: Security headers
- **CORS**: Configured for specific origins
- **JWT**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds of 12
- **Input Validation**: Request validation
- **File Upload**: Size limits and type restrictions

## 📊 Database Schema

Key models:

- **User**: User accounts with roles
- **Listing**: Product listings
- **Category**: Hierarchical categories
- **Message**: Chat messages
- **Notification**: User notifications
- **Favorite**: Saved listings
- **Report**: Content reports
- **UserBan**: User bans and restrictions

## 🚀 Deployment

1. **Build the project**

```bash
npm run build
```

2. **Run migrations**

```bash
npx prisma migrate deploy
```

3. **Start production server**

```bash
npm start
```

## 📝 API Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description"
}
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📄 License

This project is private

## 📞 Support

For support, email ouaretchakib@gmail.com

## 🔄 Version

Current Version: 1.0.0

## 🎯 Roadmap

- [ ] Payment integration
- [ ] Mobile app API optimization
- [ ] AI-powered recommendations

---

Built with ❤️ by MactaLog
