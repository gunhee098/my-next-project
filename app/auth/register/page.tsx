"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/components/LanguageProvider";
import en from "@/locales/en.json";
import ja from "@/locales/ja.json";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null); // 메시지 상태 추가
  const router = useRouter();
  const { lang, setLang } = useLang();
  const dict = lang === "ja" ? ja : en;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null); // 새로운 시도 시 메시지 초기화

    try {
      const res = await fetch("/api/auth/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "register", name, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ text: dict.registerSuccess, type: "success" }); // 성공 메시지 표시
        // 회원가입 성공 후 바로 로그인 페이지로 이동하는 대신, 메시지를 보고 사용자가 수동으로 이동하도록 변경할 수 있습니다.
        // 현재는 메시지 표시 후 바로 이동하도록 유지합니다. 필요에 따라 아래 줄을 주석 처리할 수 있습니다.
        setTimeout(() => router.push("/"), 2000); // 2초 후 로그인 페이지로 이동 (UX 개선)
      } else {
        setMessage({ text: data.error || dict.registerFail, type: "error" }); // 실패 메시지 표시
      }
    } catch (error) {
      console.error("회원가입 중 서버 오류 발생:", error);
      setMessage({ text: dict.serverError, type: "error" }); // 서버 오류 메시지 표시
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 relative">
      {/* 🔤 언어 전환 버튼 */}
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
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">{dict.registerTitle}</h2>
        
        {/* 메시지 표시 영역 */}
        {message && (
          <div
            className={`mb-4 px-4 py-3 rounded text-center ${
              message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
            role="alert"
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <input
              type="text"
              placeholder={dict.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400 transition"
              required
            />
          </div>
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
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg shadow-md transition" // 🔥 파란색으로 복원
          >
            {dict.registerButton}
          </button>
        </form>
        <p className="text-center mt-4 text-gray-600">
          {dict.alreadyAccountPrompt}{" "}
          <a href="/" className="text-blue-500 font-bold hover:underline">
            {dict.loginLink}
          </a>
        </p>
      </div>
    </div>
  );
}