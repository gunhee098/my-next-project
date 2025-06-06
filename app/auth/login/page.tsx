"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LanguageProvider"; // LanguageProvider import
import en from "@/locales/en.json"; // alias 경로 사용
import ja from "@/locales/ja.json"; // alias 경로 사용

export default function LoginPage() { // 컴포넌트 이름 변경: Home -> LoginPage (명확성을 위해)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { lang, setLang } = useLang(); // 언어 상태와 setter 가져오기
  const dict = lang === "ja" ? ja : en; // 현재 언어에 맞는 사전 선택

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/auth/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "login", email, password }),
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        router.push("/blog");
      } else {
        alert(data.error || dict.loginFail); // 번역된 메시지 사용
      }
    } catch (error) {
      alert(dict.serverError); // 번역된 메시지 사용
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 relative"> {/* relative 추가 */}
      {/* 🔤 언어 전환 버튼 - 오른쪽 상단 고정 */}
      <div className="absolute top-4 right-4">
        <div className="inline-flex shadow rounded overflow-hidden">
          <button
            onClick={() => setLang("en")}
            className={`px-3 py-1 font-medium ${
              lang === "en" ? "bg-blue-600 text-white" : "bg-gray-200 text-black"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLang("ja")}
            className={`px-3 py-1 font-medium ${
              lang === "ja" ? "bg-blue-600 text-white" : "bg-gray-200 text-black"
            }`}
          >
            JP
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg w-96">
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">{dict.loginTitle}</h2>  
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <input
              type="email"
              placeholder={dict.emailPlaceholder} 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 transition"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder={dict.passwordPlaceholder} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 transition"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg shadow-md transition"
          >
            {dict.loginButton} {/* 번역 */}
          </button>
        </form>
        <p className="text-center mt-4 text-gray-600">
          {dict.noAccountPrompt}{" "} {/* 번역 */}
          <a href="/auth/register" className="text-blue-500 font-bold hover:underline">
            {dict.registerLink} {/* 번역 */}
          </a>
        </p>
      </div>
    </div>
  );
}