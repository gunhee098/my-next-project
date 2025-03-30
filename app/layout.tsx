"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "@/styles/globals.css"; // ✅ 절대 경로 사용
export default function Layout({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    router.push("/blog");
  };

  return (
    <html lang="ko">
      <body>
        <nav>
   
        </nav>
        <main>{children}</main> {/* ✅ 여기서 children을 감싸줘야 에러 안 남! */}
      </body>
    </html>
  );
}

