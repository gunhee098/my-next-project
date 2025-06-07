---
📝 My Next.js Blog Project
This is a blog web application built with Next.js and PostgreSQL. It provides user authentication and post management functionalities based on JWT authentication, RESTful APIs, and dynamic routing.

---
📁 Project Folder Structure (Summary)
app/
├── api/                # Server API Routes (App Router based)
│   ├── auth/route.ts               # User login, password hashing, etc.
│   ├── auth/me/route.ts           # Token authentication → returns user ID
│   ├── posts/route.ts             # Fetching all posts, creating posts
│   ├── posts/[id]/route.ts        # Fetching/editing/deleting specific posts
│   └── user/route.ts              # Fetching user information
│
├── auth/
│   ├── register/page.tsx          # User registration page
│   └── login/page.tsx             # User login page
│
├── blog/
│   ├── [id]/page.tsx              # Blog post detail page
│   ├── [id]/edit/page.tsx         # Blog post edit page
│   ├── new/page.tsx               # New blog post creation page
│   └── page.tsx                   # Blog post listing page
│
├── components/
│   ├── post-form.tsx              # Reusable Post Form component
│   └── LanguageProvider.tsx       # Component for language context (i18n)
│
├── lib/
│   ├── auth.ts                    # Utility functions for JWT tokens
│   ├── db.ts                      # PostgreSQL connection pool
│   └── prisma.ts                  # Prisma ORM setup (if used)
│
├── locales/
│   ├── en.json                    # English language translations
│   └── ja.json                    # Japanese language translations
│
├── styles/
│   └── globals.css                # Global CSS styles
│
├── layout.tsx                     # Global layout for the application
├── middleware.ts                  # Middleware for token authentication
├── page.tsx                       # Login page (serves as main entry)
└── providers.tsx                  # Global providers (e.g., authentication, i18n)

---
🚀 Key Features
| Feature                 | Description                                                   |
| :---------------------- | :------------------------------------------------------------ |
| User Registration       | Available at /auth/register page.                             |
| Login/Logout            | JWT token-based authentication (using localStorage).          |
| Post Creation           | Only authenticated users can create posts.                    |
| Post Edit/Delete        | Users can only edit/delete their own posts.                   |
| JWT Auth Middleware     | Handles login status check and protects routes.               |
| RESTful API Structure   | All server requests are handled via /api routes.              |
| Internationalization (i18n) | Supports multiple languages (English, Japanese) via locale files. |

---
🛠️ Tech Stack Used
| Area            | Technology                                    |
| :-------------- | :-------------------------------------------- |
| Framework       | Next.js App Router (13+)                      |
| Frontend        | React, TypeScript, Tailwind CSS               |
| State Management| None (managed with useState, useEffect)       |
| Backend         | Next.js API Routes (App Router based)         |
| Database        | PostgreSQL                                    |
| ORM/Querying    | Direct SQL queries (using pool.query) / Prisma (if applicable) |
| Authentication  | JWT (jsonwebtoken), Middleware authentication |
| Internationalization | Next.js i18n routing, JSON locale files    |
| Deployment Prep | GitHub push completed, environment variables pending setup |

---
# Getting Started

# 1. Install dependencies
```bash
npm install

2. Start PostgreSQL (Local DB setup required)

3. Run the development server
npm run dev
