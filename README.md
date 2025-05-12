# LINQ Landing Page with Admin Dashboard

A modern landing page with a secure admin dashboard for managing subscriber data.

## Features

- Modern, Apple-inspired landing page design
- Subscriber collection form
- Secure admin dashboard with authentication
- MongoDB database integration
- Real-time subscriber statistics

## Setup Instructions

1. Install MongoDB:
   - Download from: https://www.mongodb.com/try/download/community
   - Install with default settings
   - MongoDB will run as a Windows service

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the servers:
   - Main server (API & Database): `node server/server.js`
   - Static file server: `node server/static-server.js`

4. Access the pages:
   - Landing page: http://localhost:8000
   - Admin login: http://localhost:8000/admin-login.html
   - Admin dashboard: http://localhost:8000/admin.html

## Admin Access

Default credentials:
- Username: `admin`
- Password: `admin123`

## Project Structure

```
├── index.html          # Landing page
├── admin.html         # Admin dashboard
├── admin-login.html   # Admin login page
├── css/              # Stylesheets
├── js/               # JavaScript files
│   ├── script.js     # Main landing page script
│   └── admin.js      # Admin dashboard script
├── server/           # Backend files
│   ├── server.js     # Main server with API endpoints
│   └── static-server.js # Static file server
└── package.json      # Project dependencies
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Protected API endpoints
- Secure session management
- Token expiration after 24 hours

## Dependencies

- express
- mongoose
- cors
- dotenv
- jsonwebtoken
- bcryptjs 