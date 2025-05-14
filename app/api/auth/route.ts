import { NextResponse } from "next/server";
import pool from "@/lib/db"; // DB 연결
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs"; // 🔥 비밀번호 해싱 추가

const SALT_ROUNDS = 10; // 비밀번호 해싱 강도

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("📥 받은 요청 데이터:", body); // ✅ 요청 데이터 확인
    console.log("🔑 JWT_SECRET:", process.env.JWT_SECRET); // ✅ 환경 변수 확인

    const { type, name, email, password } = body;

    if (!type) {
      return NextResponse.json({ error: "type 값이 필요합니다. (login 또는 register)" }, { status: 400 });
    }

    if (!email || !password) {
      return NextResponse.json({ error: "이메일과 비밀번호를 입력하세요!" }, { status: 400 });
    }

    if (type === "register") {
      try {
        console.log("🔍 회원가입 시도:", { name, email });

        // 기존 이메일 확인
        const existingUser = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);        console.log("📌 기존 사용자 조회 결과:", existingUser?.rowCount);
        if ((existingUser?.rowCount ?? 0) > 0) {
          return NextResponse.json({ error: "이미 가입된 이메일입니다!" }, { status: 409 });
        }

        // 비밀번호 해싱 🔥
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        console.log("🔒 해싱된 비밀번호:", hashedPassword); // ✅ 해싱된 비밀번호 확인

        // DB 저장
        await pool.query('INSERT INTO "User" (name, email, password) VALUES ($1, $2, $3)', [name, email, hashedPassword]);

        console.log("✅ 회원가입 완료!"); // ✅ 회원가입 성공 로그
        return NextResponse.json({ message: "회원가입 성공!" }, { status: 201 });
      } catch (err) {
        console.error("🚨 회원가입 중 오류 발생:", err); // ❗ 추가된 디버깅 로그
        return NextResponse.json({ error: "회원가입 중 서버 오류 발생!" }, { status: 500 });
      }
    }

    if (type === "login") {
      try {
        console.log("🔍 로그인 시도:", email);

        const userResult = await pool.query('SELECT * FROM "User" WHERE email = $1', [email]);
        console.log("📌 로그인 사용자 조회 결과:", userResult?.rowCount);

        if (userResult.rowCount === 0) {
          return NextResponse.json({ error: "해당 이메일이 존재하지 않습니다!" }, { status: 404 });
        }

        const user = userResult.rows[0];

        // 🔥 비밀번호 검증
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return NextResponse.json({ error: "비밀번호가 올바르지 않습니다!" }, { status: 401 });
        }

        // JWT 토큰 발급
        const token = jwt.sign(
          { id: user.id, email: user.email,name: user.name}, // ✅ id 포함
          process.env.JWT_SECRET || "default_secret", // ✅ 기본값 설정
          { expiresIn: "1h" }
        );
        console.log("🔐 생성된 토큰:", token); // ✅ 토큰 확인

        // ✅ 토큰을 응답 JSON에 포함하여 반환
        return NextResponse.json({ message: "로그인 성공!", token }, { status: 200 });
      } catch (err) {
        console.error("🚨 로그인 중 오류 발생:", err);
        return NextResponse.json({ error: "로그인 중 서버 오류 발생!" }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  } catch (error) {
    console.error("🚨 서버 오류 발생:", error);
    return NextResponse.json({ error: "서버 오류 발생!" }, { status: 500 });
  }
}