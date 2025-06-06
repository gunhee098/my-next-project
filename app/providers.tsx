// app/providers.tsx
"use client";

import { LanguageProvider } from "@/components/LanguageProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
