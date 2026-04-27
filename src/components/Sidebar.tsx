"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/auth-actions";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Workouts", href: "/workouts" },
  { label: "Weight & Calorie Tracker", href: "/weight-tracker" },
  { label: "Goals", href: "/goals" },
  { label: "Analytics", href: "/analytics" },
  { label: "Hire Trainers", href: "/trainers" },
  { label: "Community Forum", href: "/forum" },
  { label: "Store", href: "/store" },
  { label: "Profile", href: "/profile" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-zinc-200 bg-white shadow-sm">
      {/* Logo/Brand */}
      <div className="border-b border-zinc-200 p-6">
        <h1 className="text-2xl font-bold text-zinc-950">FITAPP</h1>
      </div>

      {/* Navigation */}
      <nav className="space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="absolute bottom-6 left-4 right-4">
        <form action={logoutAction} className="w-full">
          <button
            type="submit"
            className="w-full rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}
