"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  CalendarCheck2,
  CalendarClock,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Monitor,
  Settings,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { adminApi, adminKeys } from "@/lib/admin-api";
import { ADMIN_REQUEST_HEADER } from "@/lib/admin-session";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const MAIN_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck2 },
  { href: "/admin/units", label: "Units", icon: Monitor },
  { href: "/admin/slots", label: "Slots", icon: CalendarClock },
  { href: "/admin/food", label: "Food", icon: UtensilsCrossed },
];
const SETTINGS_NAV: NavItem = { href: "/admin/settings", label: "Settings", icon: Settings };

const COLLAPSED_WIDTH = 72;
const EXPANDED_WIDTH = 228;

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Floating vertical pill on the left. The white active circle slides between
 * items via a shared layoutId. Overlays the content when expanded, so the
 * page never reflows.
 */
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  // Expands on hover only where there is room and a real pointer.
  const canExpand = useMediaQuery("(min-width: 1024px) and (hover: hover)");
  const [hovered, setHovered] = useState(false);
  const expanded = canExpand && hovered;
  const stats = useQuery({ queryKey: adminKeys.stats, queryFn: adminApi.stats, refetchInterval: 60_000 });
  const pending = stats.data?.pendingCount ?? 0;

  const logout = async () => {
    try {
      const registration = await navigator.serviceWorker?.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/admin/push-subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json", [ADMIN_REQUEST_HEADER]: "1" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
          signal: AbortSignal.timeout(2000),
        }).catch(() => undefined);
        await subscription.unsubscribe().catch(() => false);
      }
    } catch {
      // A stale server-side endpoint is removed after its push service returns 410.
    }
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  const renderItem = (item: NavItem, order: number) => {
    const active = isActive(pathname, item.href);
    const badge = item.href === "/admin/bookings" && pending > 0 ? pending : null;
    return (
      <motion.li
        key={item.href}
        initial={{ opacity: 0, x: -14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 + order * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <Link
          href={item.href}
          aria-label={badge ? `${item.label}, ${badge} pending` : item.label}
          aria-current={active ? "page" : undefined}
          className={`group relative flex h-12 items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
            expanded ? "w-full gap-3 px-3.5" : "w-12 justify-center"
          }`}
        >
          {active && (
            <motion.span
              layoutId="sidebar-active"
              aria-hidden
              className="absolute inset-0 rounded-full bg-white shadow-admin-lift"
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
            />
          )}
          <item.icon
            aria-hidden
            strokeWidth={2}
            className={`relative size-5 shrink-0 transition-colors ${active ? "text-burgundy" : "text-white/70 group-hover:text-white"}`}
          />
          {expanded && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className={`relative text-sm font-bold whitespace-nowrap ${active ? "text-burgundy" : "text-white/80 group-hover:text-white"}`}
            >
              {item.label}
            </motion.span>
          )}
          {badge && (
            <span
              aria-hidden
              className={`absolute grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-extrabold text-burgundy ring-2 ring-burgundy ${
                expanded ? "relative ml-auto" : "-top-0.5 -right-0.5"
              }`}
            >
              {badge > 99 ? "99+" : badge}
            </span>
          )}
          {!expanded && (
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full z-10 ml-4 rounded-full bg-wine-ink px-3 py-1.5 text-xs font-bold whitespace-nowrap text-white opacity-0 shadow-admin-lift transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {item.label}
            </span>
          )}
        </Link>
      </motion.li>
    );
  };

  return (
    <motion.nav
      aria-label="Admin"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0, width: expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      style={{ width: COLLAPSED_WIDTH }}
      className="bg-sidebar fixed top-3 bottom-3 left-3 z-50 flex max-w-[calc(100vw-24px)] flex-col items-center rounded-[36px] border border-white/10 py-5 shadow-sidebar sm:top-4 sm:bottom-4 sm:left-4 max-sm:!w-16"
    >
      <Link
        href="/admin"
        aria-label="District VIII admin home"
        className={`mb-6 flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${expanded ? "self-start pl-4" : ""}`}
      >
        <span className="grid size-11 place-items-center rounded-full bg-white text-burgundy shadow-admin-lift">
          <span className="-skew-x-8 font-display text-lg leading-none">D8</span>
        </span>
        {expanded && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="-skew-x-8 font-display text-xl whitespace-nowrap text-white">
            district VIII
          </motion.span>
        )}
      </Link>

      <ul className={`flex flex-1 flex-col gap-2 ${expanded ? "w-full px-3" : "items-center"}`}>{MAIN_NAV.map((item, index) => renderItem(item, index))}</ul>

      <ul className={`flex flex-col gap-2 ${expanded ? "w-full px-3" : "items-center"}`}>
        {renderItem(SETTINGS_NAV, MAIN_NAV.length)}
        <li>
          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Log out"
            className={`group relative flex h-12 items-center rounded-full text-white/70 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/80 ${
              expanded ? "w-full gap-3 px-3.5" : "w-12 justify-center"
            }`}
          >
            <LogOut aria-hidden strokeWidth={2} className="size-5 shrink-0" />
            {expanded && <span className="text-sm font-bold whitespace-nowrap">Log out</span>}
            {!expanded && (
              <span
                role="tooltip"
                className="pointer-events-none absolute left-full z-10 ml-4 rounded-full bg-wine-ink px-3 py-1.5 text-xs font-bold whitespace-nowrap text-white opacity-0 shadow-admin-lift transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                Log out
              </span>
            )}
          </button>
        </li>
      </ul>
    </motion.nav>
  );
}
