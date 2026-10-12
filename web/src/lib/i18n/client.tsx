"use client";
import { createContext, useContext } from "react";
import { dicts, type Dict } from "./dict";
import type { Locale } from "../gifts";

const I18nContext = createContext<{ t: Dict; locale: Locale }>({ t: dicts.es, locale: "es" });

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <I18nContext.Provider value={{ t: dicts[locale], locale }}>{children}</I18nContext.Provider>;
}

export const useT = () => useContext(I18nContext);
