📝 My Next.js Blog Project
This is a blog web application built with Next.js and PostgreSQL. It provides user authentication and post management functionalities based on JWT authentication, RESTful APIs, and dynamic routing.

📁 Project Folder Structure (Summary)
app/
├── api/                # Server API Routes (App Router based)
│   ├── auth/route.ts               # User login, password hashing, etc.
│   ├── auth/me/route.ts           # Token authentication → returns user ID
│   ├── posts/route.ts             # Fetching all posts, creating posts
│   ├── posts/[id]/route.ts        # Fetching/editing/deleting specific posts
│   ├── comments/route.ts          # Creating/fetching comments
│   ├── user/route.ts              # Fetching user information
│   └── test/route.ts              # API for DB testing
│
├── auth/
│   └── register/page.tsx          # User registration page
│
├── blog/
│   ├── [id]/page.tsx              # Blog post detail page
│   ├── [id]/edit/page.tsx         # Blog post edit page
│   ├── new/page.tsx               # New blog post creation page
│   └── page.tsx                   # Blog post listing page
│
├── components/
│   └── post-form.tsx              # Reusable Post Form component
│
├── lib/
│   ├── auth.ts                    # Utility functions for JWT tokens
│   └── db.ts                      # PostgreSQL connection pool
│
├── styles/
│   └── globals.css                # Global CSS styles
│
├── layout.tsx                     # Global layout for the application
├── middleware.ts                  # Middleware for token authentication
└── page.tsx                       # Login page (serves as main entry)

🚀 Key Features
Feature	Description
User Registration	Available at /auth/register page.
Login/Logout	JWT token-based authentication (using localStorage).
Post Creation	Only authenticated users can create posts.
Post Edit/Delete	Users can only edit/delete their own posts.
Comment Creation	Users can create their own comments (deletion/editing not yet implemented).
JWT Auth Middleware	Handles login status check and protects routes.
RESTful API Structure	All server requests are handled via /api routes.

🛠️ Tech Stack Used
Area	Technology
Framework	Next.js App Router (13+)
Frontend	React, TypeScript, Tailwind CSS
State Management	None (managed with useState, useEffect)
Backend	Next.js API Routes (App Router based)
Database	PostgreSQL
ORM/Querying	Direct SQL queries (using pool.query)
Authentication	JWT (jsonwebtoken), Middleware authentication
Deployment Prep	GitHub push completed, environment variables pending setup

# 1. Install dependencies
npm install

# 2. Start PostgreSQL (Local DB setup required)
# 3. Run the development server
npm run dev

