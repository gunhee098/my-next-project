"use client";

import { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext<{ lang: string; setLang: (lang: string) => void }>({
  lang: "en",
  setLang: () => {},
});

export const useLang = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState("en");

  useEffect(() => {
    const storedLang = localStorage.getItem("lang");
    if (storedLang) {
      setLang(storedLang);
    }
  }, []);

  const changeLang = (newLang: string) => {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLang }}>
      {children}
    </LanguageContext.Provider>
  );
};
