"use client";
import Link from "next/link";
import { PrivacyModeSelector } from "./features/privacy/privacy-mode-selector";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  const links: Array<{ to: string; label: string }> = [
    { to: "/", label: "Home" },
    { to: "/chat", label: "Chat" },
    { to: "/models", label: "Models" },
    { to: "/dashboard", label: "Dashboard" },
  ];

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <div className="flex items-center gap-4">
          <PrivacyModeSelector />
          <nav className="flex gap-4 text-lg">
            {links.map(({ to, label }) => (
              <Link href={to as "/"} key={to}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
      <hr />
    </div>
  );
}
