"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleRegister = async () => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "register", name, email, password }),
    });

    const data = await res.json();
    if (data.error) {
      setMessage(data.error);
      setSuccess(false);
      setShowModal(false);
    } else {
      // ✅ 자동 로그인 시도
      const loginRes = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "login", email, password }),
      });
    
      const loginData = await loginRes.json();
      if (loginRes.ok) {
        localStorage.setItem("token", loginData.token);
        setMessage("🎉 회원가입을 축하드립니다! 🎉");
        setSuccess(true);
        setShowModal(true); // 로그인 성공 시 모달 띄우기
      } else {
        setMessage("회원가입은 성공했지만 로그인에 실패했습니다.");
        setSuccess(false);
      }
    }
  };
  const handleYes = () => {
    router.push("/blog"); // 블로그 페이지로 이동
  };

  const handleNo = () => {
    router.push("/"); // 메인 페이지(로그인)으로 이동
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 relative">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md z-10">
        <h2 className="text-2xl font-bold text-center mb-6">회원가입</h2>

        <input
          type="text"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleRegister}
          className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition"
        >
          회원가입
        </button>

        {message && !showModal && (
          <p
            className={`mt-4 text-center font-semibold ${
              success ? "text-green-600 animate-bounce" : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}
      </div>

      {/* ✅ 회원가입 성공 모달 */}
      {showModal && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
          <div className="bg-white rounded-lg shadow-lg p-6 w-80 text-center">
            <p className="text-lg font-semibold mb-4">
              🎉 회원가입이 완료되었습니다!
              <br />
              로그인 하시겠습니까?
            </p>
            <div className="flex justify-around mt-4">
              <button
                onClick={handleYes}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
              >
                예
              </button>
              <button
                onClick={handleNo}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition"
              >
                아니요
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}