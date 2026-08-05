import {
  Inbox,
  Eye,
  Boxes,
  TrendingUp,
  Settings as SettingsIcon,
  HelpCircle,
  Radar,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ViewId =
  | "inbox"
  | "watches"
  | "vendors"
  | "trends"
  | "settings"
  | "how-it-works";

const GROUPS: { label: string; items: { id: ViewId; label: string; icon: typeof Inbox }[] }[] = [
  {
    label: "Monitor",
    items: [
      { id: "inbox", label: "Change inbox", icon: Inbox },
      { id: "watches", label: "Watches", icon: Eye },
      { id: "vendors", label: "Vendors & usage", icon: Boxes },
      { id: "trends", label: "Trends", icon: TrendingUp },
    ],
  },
  {
    label: "Workspace",
    items: [
      { id: "settings", label: "Settings", icon: SettingsIcon },
      { id: "how-it-works", label: "How it works", icon: HelpCircle },
    ],
  },
];

export const VIEW_TITLE: Record<ViewId, string> = {
  inbox: "Change inbox",
  watches: "Watches",
  vendors: "Vendors & usage",
  trends: "Trends",
  settings: "Settings",
  "how-it-works": "How it works",
};

export const VIEW_GROUP: Record<ViewId, string> = {
  inbox: "Monitor",
  watches: "Monitor",
  vendors: "Monitor",
  trends: "Monitor",
  settings: "Workspace",
  "how-it-works": "Workspace",
};

export function Sidebar({
  view,
  onSelect,
  p0Count,
}: {
  view: ViewId;
  onSelect: (v: ViewId) => void;
  p0Count: number;
}) {
  return (
    <aside className="flex w-60 shrink-0 flex-col bg-nav text-nav-foreground">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand">
          <Radar className="size-4 text-white" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight">DriftWatch</span>
          <span className="text-[11px] text-nav-muted">Voice Platform · Prod</span>
        </span>
      </div>

      <nav className="flex-1 px-3 py-2">
        {GROUPS.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-nav-muted">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = view === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(item.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                        active
                          ? "bg-nav-active font-medium text-nav-foreground"
                          : "text-nav-muted hover:bg-nav-active/60 hover:text-nav-foreground",
                      )}
                    >
                      <item.icon className="size-4 shrink-0" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.id === "inbox" && p0Count > 0 && (
                        <span className="rounded-full bg-p0 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {p0Count}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-nav-line px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-nav-active text-xs font-semibold">
            AM
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-medium">Aditi Mehra</span>
            <span className="text-[11px] text-nav-muted">Platform lead</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
