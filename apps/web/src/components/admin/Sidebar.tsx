"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarCheck2,
  CalendarClock,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  type LucideIcon,
  Monitor,
  Settings,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { adminApi, adminKeys } from "@/lib/admin-api";
import { ADMIN_REQUEST_HEADER } from "@/lib/admin-session";

interface NavItem {
  href: string;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
  placement: "bottom" | "more";
}

// The single source for links rendered by both desktop and mobile navigation.
export const ADMIN_NAV_ITEMS: readonly NavItem[] = [
  { href: "/admin", label: "Dashboard", mobileLabel: "Home", icon: LayoutDashboard, placement: "bottom" },
  { href: "/admin/bookings", label: "Bookings", mobileLabel: "Bookings", icon: CalendarCheck2, placement: "bottom" },
  { href: "/admin/units", label: "Units", mobileLabel: "Units", icon: Monitor, placement: "more" },
  { href: "/admin/slots", label: "Slots", mobileLabel: "Slots", icon: CalendarClock, placement: "bottom" },
  { href: "/admin/food", label: "Food", mobileLabel: "Food", icon: UtensilsCrossed, placement: "more" },
  { href: "/admin/settings", label: "Settings", mobileLabel: "Settings", icon: Settings, placement: "more" },
];

const COLLAPSED_WIDTH = 64;
const EXPANDED_WIDTH = 204;

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const canExpand = useMediaQuery("(min-width: 1024px) and (hover: hover)");
  const [hovered, setHovered] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const expanded = canExpand && hovered;
  const moreButton = useRef<HTMLButtonElement>(null);
  const moreMenu = useRef<HTMLDivElement>(null);
  const stats = useQuery({ queryKey: adminKeys.stats, queryFn: adminApi.stats, refetchInterval: 60_000 });
  const pending = stats.data?.pendingCount ?? 0;
  const bottomItems = ADMIN_NAV_ITEMS.filter((item) => item.placement === "bottom");
  const moreItems = ADMIN_NAV_ITEMS.filter((item) => item.placement === "more");
  const moreActive = moreItems.some((item) => isActive(pathname, item.href));

  useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!moreButton.current?.contains(target) && !moreMenu.current?.contains(target)) setMoreOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMoreOpen(false);
        moreButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  const logout = async () => {
    setMoreOpen(false);
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

  const renderDesktopItem = (item: NavItem, order: number) => {
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
          className={`group relative flex h-11 items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
            expanded ? "w-full gap-2.5 px-3" : "w-11 justify-center"
          }`}
        >
          {active && <motion.span layoutId="sidebar-active" aria-hidden className="absolute inset-0 rounded-full bg-white shadow-admin-lift" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
          <item.icon aria-hidden strokeWidth={2} className={`relative size-[18px] shrink-0 transition-colors ${active ? "text-burgundy" : "text-white/70 group-hover:text-white"}`} />
          {expanded && <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className={`relative text-sm font-bold whitespace-nowrap ${active ? "text-burgundy" : "text-white/80 group-hover:text-white"}`}>{item.label}</motion.span>}
          {badge && <span aria-hidden className={`absolute grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[10px] font-extrabold text-burgundy ring-2 ring-burgundy ${expanded ? "relative ml-auto" : "-top-0.5 -right-0.5"}`}>{badge > 99 ? "99+" : badge}</span>}
          {!expanded && <span role="tooltip" className="pointer-events-none absolute left-full z-10 ml-4 rounded-full bg-wine-ink px-3 py-1.5 text-xs font-bold whitespace-nowrap text-white opacity-0 shadow-admin-lift transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">{item.label}</span>}
        </Link>
      </motion.li>
    );
  };

  return (
    <>
      <motion.nav
        aria-label="Admin"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0, width: expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        style={{ width: COLLAPSED_WIDTH }}
        className="bg-sidebar fixed top-4 bottom-4 left-4 z-50 hidden flex-col items-center rounded-[32px] border border-white/10 py-4 shadow-sidebar md:flex"
      >
        <Link href="/admin" aria-label="District VIII admin home" className={`mb-5 flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${expanded ? "self-start pl-3" : ""}`}>
          <span className="grid size-10 place-items-center rounded-full bg-white text-burgundy shadow-admin-lift"><span className="-skew-x-8 font-display text-lg leading-none">D8</span></span>
          {expanded && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="-skew-x-8 font-display text-xl whitespace-nowrap text-white">district VIII</motion.span>}
        </Link>
        <ul className={`flex flex-1 flex-col gap-1.5 ${expanded ? "w-full px-2.5" : "items-center"}`}>
          {ADMIN_NAV_ITEMS.filter((item) => item.href !== "/admin/settings").map((item, index) => renderDesktopItem(item, index))}
        </ul>
        <ul className={`flex flex-col gap-1.5 ${expanded ? "w-full px-2.5" : "items-center"}`}>
          {renderDesktopItem(ADMIN_NAV_ITEMS.find((item) => item.href === "/admin/settings")!, ADMIN_NAV_ITEMS.length)}
          <li>
            <button type="button" onClick={() => void logout()} aria-label="Log out" className={`group relative flex h-11 items-center rounded-full text-white/70 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/80 ${expanded ? "w-full gap-2.5 px-3" : "w-11 justify-center"}`}>
              <LogOut aria-hidden strokeWidth={2} className="size-[18px] shrink-0" />
              {expanded && <span className="text-sm font-bold whitespace-nowrap">Log out</span>}
              {!expanded && <span role="tooltip" className="pointer-events-none absolute left-full z-10 ml-4 rounded-full bg-wine-ink px-3 py-1.5 text-xs font-bold whitespace-nowrap text-white opacity-0 shadow-admin-lift transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Log out</span>}
            </button>
          </li>
        </ul>
      </motion.nav>

      <nav aria-label="Admin mobile" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/70 bg-white/90 px-2 pt-2 shadow-[0_-10px_35px_-20px_rgba(57,7,20,0.35)] backdrop-blur-xl backdrop-saturate-150 md:hidden" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}>
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {bottomItems.map((item) => {
            const active = isActive(pathname, item.href);
            const badge = item.href === "/admin/bookings" && pending > 0 ? pending : null;
            return <li key={item.href}>
              <Link href={item.href} aria-label={item.mobileLabel} aria-current={active ? "page" : undefined} className={`relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-burgundy ${active ? "text-burgundy" : "text-wine-ink/60 hover:text-burgundy"}`}>
                <item.icon aria-hidden className="size-5" strokeWidth={2} />
                <span>{item.mobileLabel}</span>
                {badge && <span aria-label={`${badge} pending`} className="absolute top-0.5 left-[calc(50%+9px)] grid h-4 min-w-4 place-items-center rounded-full bg-burgundy px-1 text-[9px] font-bold text-white">{badge > 99 ? "99+" : badge}</span>}
              </Link>
            </li>;
          })}
          <li>
            <button ref={moreButton} type="button" aria-label="More navigation options" aria-haspopup="menu" aria-expanded={moreOpen} aria-controls="admin-more-menu" onClick={() => setMoreOpen((open) => !open)} className={`flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-burgundy ${moreActive || moreOpen ? "text-burgundy" : "text-wine-ink/60 hover:text-burgundy"}`}>
              <MoreHorizontal aria-hidden className="size-5" strokeWidth={2} /><span>More</span>
            </button>
          </li>
        </ul>
      </nav>

      <AnimatePresence>
        {moreOpen && <motion.div ref={moreMenu} id="admin-more-menu" role="menu" aria-label="More admin pages" initial={{ opacity: 0, scale: 0.94, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 8 }} transition={{ duration: 0.16, ease: "easeOut" }} style={{ transformOrigin: "bottom left", bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }} className="fixed left-3 z-[60] w-56 rounded-2xl border border-white/70 bg-white/90 p-2 shadow-[0_16px_40px_-16px_rgba(57,7,20,0.38)] backdrop-blur-xl md:hidden">
          <ul className="space-y-1">
            {moreItems.map((item) => {
              const active = isActive(pathname, item.href);
              return <li key={item.href} role="none"><Link role="menuitem" href={item.href} aria-current={active ? "page" : undefined} onClick={() => setMoreOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-burgundy ${active ? "bg-burgundy/8 text-burgundy" : "text-wine-ink/75 hover:bg-burgundy/5"}`}><item.icon aria-hidden className="size-[18px]" /><span>{item.label}</span></Link></li>;
            })}
            <li role="none"><button role="menuitem" type="button" onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-wine-ink/75 outline-none hover:bg-burgundy/5 focus-visible:ring-2 focus-visible:ring-burgundy"><LogOut aria-hidden className="size-[18px]" /><span>Log out</span></button></li>
          </ul>
        </motion.div>}
      </AnimatePresence>
    </>
  );
}
