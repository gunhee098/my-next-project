/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./styles/globals.css" // ✅ 절대경로 `@/` 대신 상대경로 사용
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};