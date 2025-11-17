import type { Route } from "./+types/process";
import { PrismaClient } from "@prisma/client";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";

const prisma = new PrismaClient();

export async function loader({}: Route.LoaderArgs) {
  const items = await prisma.wasteItem.findMany({
    where: { isActive: true },
    select: { id: true, label: true, color: true, icon: true },
  });
  const outlet = await prisma.outlet.findFirst({
    select: { id: true, timezone: true, closingTime: true } as any,
  });
  console.log("outlet", outlet);
  console.log("items", items);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const grouped = await prisma.wasteEntry.groupBy({
    by: ["itemId"],
    where: { recordedAt: { gte: start, lte: end } },
    _sum: { quantity: true },
  });

  const counts = new Map<number, number>();
  for (const g of grouped) {
    const sum = g._sum.quantity ?? 0;
    counts.set(g.itemId, Number(sum));
  }

  return {
    items: items.map((it) => ({
      id: it.id,
      label: it.label,
      color: it.color,
      icon: it.icon,
      count: counts.get(it.id) ?? 0,
    })),
    outlet,
  };
}

export default function Process({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const { items: initial, outlet } = loaderData as {
    items: {
      id: number;
      label: string;
      color: string;
      icon?: string | null;
      count: number;
    }[];
    outlet?: {
      id: number;
      timezone: string;
      closingTime?: string | null;
    } | null;
  };
  const [items, setItems] = useState(initial);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [toast, setToast] = useState<string>("");
  const toastTimerRef = useRef<number | null>(null);
  const timers = useRef<Record<number, number>>({});
  const lastClosedRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        setIsAdmin(String(u.role).toLowerCase() === "admin");
      }
    } catch {}
  }, []);

  useEffect(() => {
    const tz = outlet?.timezone || "UTC";
    const closingStr = outlet?.closingTime;
    if (!closingStr) return;
    const partsStr = closingStr.split(":");
    const closing = Number(partsStr[0] || 0) * 60 + Number(partsStr[1] || 0);
    const getLocal = () => {
      const parts = new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: tz,
      }).formatToParts(new Date());
      const h = Number(parts.find((p) => p.type === "hour")?.value || "0");
      const m = Number(parts.find((p) => p.type === "minute")?.value || "0");
      const y = Number(parts.find((p) => p.type === "year")?.value || "0");
      const mo = Number(parts.find((p) => p.type === "month")?.value || "0");
      const d = Number(parts.find((p) => p.type === "day")?.value || "0");
      const key = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      return { minutes: h * 60 + m, key };
    };
    const check = () => {
      const { minutes, key } = getLocal();
      if (minutes === closing && lastClosedRef.current !== key) {
        lastClosedRef.current = key;
        navigate("/login-pin");
      }
    };
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [navigate, outlet]);

  const applyDelta = async (id: number, delta: 1 | -1) => {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, count: Math.max(0, it.count + delta) } : it
      )
    );
    console.log("applyDelta", id, delta);
    try {
      const res = await fetch("/api/process/entry", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ itemId: String(id), delta: String(delta) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data && !data.skipped) {
        const it = items.find((x) => x.id === id);
        const label = it ? it.label : String(id);
        const msg = delta === 1 ? `${label} was increased 1` : `${label} was reduced 1`;
        setToast(msg);
        if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = window.setTimeout(() => setToast(""), 3000);
      }
    } catch (err) {
      console.error("applyDelta error", err);
    }
  };

  const onPointerDown = (id: number) => {
    const t = window.setTimeout(() => {
      applyDelta(id, -1);
      window.clearTimeout(timers.current[id]);
      delete timers.current[id];
    }, 250);
    timers.current[id] = t;
  };

  const onPointerUp = (id: number) => {
    const t = timers.current[id];
    if (t) {
      window.clearTimeout(t);
      delete timers.current[id];
      applyDelta(id, 1);
    }
  };

  return (
    <div className="min-h-screen w-full p-4">
      {toast && (
        <div className="max-w-5xl mx-auto mb-3 px-4 py-2 rounded bg-green-600 text-white">{toast}</div>
      )}
      <div className="max-w-5xl mx-auto flex justify-end mb-4">
        {isAdmin && (
          <button
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => navigate("/portal")}
          >
            Edit Info
          </button>
        )}
      </div>
      <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8">
        {items.map((it) => (
          <div key={it.id} className="flex items-center justify-center">
            <div
              className="select-none cursor-pointer active:scale-95 transition w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-full shadow flex flex-col items-center justify-center"
              style={{ backgroundColor: it.color }}
              onPointerDown={() => onPointerDown(it.id)}
              onPointerUp={() => onPointerUp(it.id)}
              onPointerLeave={() => {
                const t = timers.current[it.id];
                if (t) {
                  window.clearTimeout(t);
                  delete timers.current[it.id];
                }
              }}
            >
              <div className="text-white text-2xl sm:text-3xl font-bold">
                {it.count}
              </div>
              <div className="text-white text-center text-sm sm:text-lg mt-1">
                {it.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
