import jwt, { JwtPayload } from "jsonwebtoken";
import { NextRequest } from "next/server";


export function verify(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret");
    if (typeof decoded === "object" && "id" in decoded) {
      return decoded as JwtPayload;
    }
    return null;
  } catch (error) {
    console.error("🚨 JWT 인증 실패:", error);
    return null;
  }
}

export function authenticateUser(req: NextRequest): number {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    throw new Error("로그인이 필요합니다!");
  }

  const userData = verify(token);
  if (!userData || typeof userData.id !== "number") {
    throw new Error("유효하지 않은 토큰입니다!");
  }

  return Number(userData.id); // 꼭 숫자로 리턴!
}