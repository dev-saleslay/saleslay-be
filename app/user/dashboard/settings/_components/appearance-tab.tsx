"use client";

import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark" | "system";

export function AppearanceTab() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }
    const savedTheme = window.localStorage.getItem("saleslay-theme") as ThemeMode | null;
    if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
      return savedTheme;
    }
    return "dark";
  });

  const applyTheme = (nextTheme: ThemeMode) => {
    const root = window.document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = nextTheme === "dark" || (nextTheme === "system" && prefersDark);
    root.classList.toggle("dark", shouldUseDark);
    window.localStorage.setItem("saleslay-theme", nextTheme);
    setTheme(nextTheme);
  };

  const options: Array<{
    key: ThemeMode;
    title: string;
    description: string;
    icon: typeof Sun;
  }> = [
    {
      key: "light",
      title: "Light",
      description: "Bright interface for daytime use",
      icon: Sun,
    },
    {
      key: "dark",
      title: "Dark",
      description: "Dimmed interface for low-light work",
      icon: Moon,
    },
    {
      key: "system",
      title: "System",
      description: "Follow your device appearance",
      icon: Monitor,
    },
  ];

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose how SalesLay should look on your device.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => applyTheme(option.key)}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                "hover:border-slate-400/70 hover:bg-slate-50 dark:hover:border-slate-500 dark:hover:bg-slate-900/50",
                isActive && "border-primary bg-primary/5 ring-1 ring-primary/30"
              )}
            >
              <span className="mt-0.5 inline-flex size-8 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{option.title}</span>
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              </span>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
