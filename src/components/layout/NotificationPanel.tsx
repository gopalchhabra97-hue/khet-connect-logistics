import { Bell, CheckCircle2, Info, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/common/States";
import { useDemo } from "@/context/DemoStore";
import type { Role } from "@/types";

const TONE = {
  info: { Icon: Info, cls: "text-info" },
  success: { Icon: CheckCircle2, cls: "text-success" },
  warning: { Icon: TriangleAlert, cls: "text-warning-foreground" },
} as const;

export function NotificationPanel({ role }: { role: Role }) {
  const { notifications, markNotificationsRead } = useDemo();
  const list = notifications.filter((n) => n.role === role);
  const unread = list.filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative min-h-11 min-w-11" aria-label={`Notifications, ${unread} unread`}>
          <Bell className="size-5" />
          {unread > 0 ? (
            <span className="absolute top-1.5 right-1.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <Button variant="ghost" size="sm" onClick={() => markNotificationsRead(role)}>
            Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-80">
          {list.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No notifications" description="Demo alerts will appear here." />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {list.map((n) => {
                const tone = TONE[n.tone];
                return (
                  <li key={n.id} className="flex gap-3 px-4 py-3">
                    <tone.Icon className={`mt-0.5 size-4 shrink-0 ${tone.cls}`} aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {n.title}
                        {!n.read ? (
                          <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                            New
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{n.time}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
