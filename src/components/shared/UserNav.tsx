"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  LogOut,
  Settings,
  User,
  LayoutDashboard,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tipi ─────────────────────────────────────────────────────

interface UserNavProps {
  className?: string;
  role?: string;
}

// ─── Pomožna funkcija — inicialke ─────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Komponenta ───────────────────────────────────────────────

export function UserNav({ className, role }: UserNavProps) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  if (!isLoaded || !user) return null;

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.emailAddresses[0]?.emailAddress ||
    "Uporabnik";

  const email = user.emailAddresses[0]?.emailAddress ?? "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2 rounded-lg px-2 py-1.5",
          "hover:bg-background-elevated transition-colors outline-none",
          "focus-visible:ring-2 focus-visible:ring-gold/50",
          className
        )}
      >
        {/* Avatar */}
        <Avatar className="h-8 w-8 border border-ink-ghost">
          <AvatarImage src={user.imageUrl} alt={displayName} />
          <AvatarFallback className="bg-background-surface text-ink text-xs font-medium">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>

        {/* Ime + vloga */}
        <div className="hidden sm:flex flex-col items-start min-w-0">
          <span className="text-sm font-medium text-ink truncate max-w-[140px]">
            {displayName}
          </span>
          {role && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 h-4 font-normal border",
                role === "ADMIN"
                  ? "text-gold border-gold/30 bg-gold/10"
                  : "text-primary border-primary/30 bg-primary/10"
              )}
            >
              {role}
            </Badge>
          )}
        </div>

        <ChevronDown className="h-3.5 w-3.5 text-ink-muted hidden sm:block" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 bg-background-surface border-ink-ghost"
      >
        {/* Header */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-ink">{displayName}</span>
            <span className="text-xs text-ink-muted truncate">{email}</span>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-ink-ghost" />

        {/* Navigacija */}
        <DropdownMenuItem
          className="text-ink-muted hover:text-ink cursor-pointer"
          onClick={() => router.push("/operator/dashboard")}
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Dashboard
        </DropdownMenuItem>

        <DropdownMenuItem
          className="text-ink-muted hover:text-ink cursor-pointer"
          onClick={() => router.push("/operator/profile")}
        >
          <User className="mr-2 h-4 w-4" />
          Profil
        </DropdownMenuItem>

        {role === "ADMIN" && (
          <DropdownMenuItem
            className="text-ink-muted hover:text-ink cursor-pointer"
            onClick={() => router.push("/admin")}
          >
            <Settings className="mr-2 h-4 w-4" />
            Admin panel
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="bg-ink-ghost" />

        {/* Odjava */}
        <DropdownMenuItem
          className="text-destructive hover:text-destructive cursor-pointer focus:text-destructive"
          onClick={() => signOut({ redirectUrl: "/" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Odjava
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
