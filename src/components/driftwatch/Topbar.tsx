import { ArrowLeft, Bell, Play, Search } from "lucide-react";
import { VIEW_GROUP, VIEW_TITLE, type ViewId } from "./Sidebar";

export function Topbar({
  view,
  query,
  onQueryChange,
  onRun,
  running,
  onOpenBuilder,
}: {
  view: ViewId;
  query: string;
  onQueryChange: (v: string) => void;
  onRun: () => void;
  running: boolean;
  onOpenBuilder: () => void;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-line bg-surface px-6">
      <button
        type="button"
        onClick={onOpenBuilder}
        aria-label="Back to stack builder"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line text-ink-dim transition-colors hover:bg-canvas"
      >
        <ArrowLeft className="size-4" />
      </button>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-ink-faint">
          {VIEW_GROUP[view]}
        </p>
        <h1 className="truncate text-base font-semibold text-ink">{VIEW_TITLE[view]}</h1>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search changes"
            aria-label="Search changes"
            className="h-9 w-56 rounded-lg border border-line bg-canvas pl-8 pr-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand focus:bg-surface"
          />
        </div>

        <button
          type="button"
          onClick={onRun}
          disabled={running}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Play className="size-3.5" />
          {running ? "Running…" : "Run watch"}
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="relative flex size-9 items-center justify-center rounded-lg border border-line text-ink-dim transition-colors hover:bg-canvas"
        >
          <Bell className="size-4" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-p0" />
        </button>
      </div>
    </header>
  );
}
