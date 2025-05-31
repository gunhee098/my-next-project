require("dotenv").config();

const nextConfig = {
  reactStrictMode: false, // ✅ Strict Mode 비활성화
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
  },
};

module.exports = nextConfig;