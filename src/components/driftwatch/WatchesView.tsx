import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ROLE_OPTIONS, ROLE_LABEL, inferProvider } from "@/lib/watch-utils";
import type { WatchRow } from "@/lib/capture.functions";
import { SectionCard, STATUS_LABEL, formatRelative } from "./shared";
import { cn } from "@/lib/utils";

export function WatchesView({
  watches,
  onAdd,
  onRemove,
  busy,
}: {
  watches: WatchRow[];
  onAdd: (url: string, role: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  busy: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [role, setRole] = useState<string>("STT");

  async function submit() {
    if (!url.trim()) {
      toast.error("Paste the page you want us to watch.");
      return;
    }
    await onAdd(url.trim(), role);
    setUrl("");
    setRole("STT");
    setAdding(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <p className="max-w-xl text-sm text-ink-dim">
          These are the vendor pages we read on every run. Paste a page, tell us what it does for
          you, and we take it from there.
        </p>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-sm font-medium text-white hover:bg-brand-hover"
          >
            <Plus className="size-4" /> Add watch
          </button>
        )}
      </div>

      {adding && (
        <SectionCard className="dw-rise p-4">
          <label className="block text-xs font-medium text-ink-dim" htmlFor="watch-url">
            Page to watch
          </label>
          <input
            id="watch-url"
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            placeholder="https://vendor.com/docs/changelog"
            className="mt-1.5 h-9 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand focus:bg-surface"
          />

          <p className="mt-4 text-xs font-medium text-ink-dim">What does this vendor do for you?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  role === r
                    ? "border-brand bg-brand text-white"
                    : "border-line bg-surface text-ink-dim hover:bg-canvas",
                )}
              >
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="inline-flex h-9 items-center rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setUrl("");
              }}
              className="inline-flex h-9 items-center rounded-lg border border-line px-4 text-sm font-medium text-ink-dim hover:bg-canvas"
            >
              Cancel
            </button>
            {url.trim() && (
              <p className="text-xs text-ink-faint">
                We'll file this under {inferProvider(url.trim())}.
              </p>
            )}
          </div>
        </SectionCard>
      )}

      <SectionCard>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wider text-ink-faint">
                <th className="px-4 py-2 font-semibold">Vendor page</th>
                <th className="px-4 py-2 font-semibold">Provider</th>
                <th className="px-4 py-2 font-semibold">Role</th>
                <th className="px-4 py-2 font-semibold">Last checked</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {watches.map((w) => (
                <tr key={w.id} className="group border-b border-line/70 last:border-0 hover:bg-canvas">
                  <td className="max-w-sm px-4 py-3 font-mono text-xs text-ink-dim">
                    <span className="block truncate">{w.url}</span>
                    {w.kind === "dated_feed" && (
                      <span className="mt-1 inline-block rounded-full bg-p3-soft px-2 py-0.5 font-sans text-[11px] font-medium text-ink-dim">
                        Dated changelog — reads new entries daily
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 font-medium text-ink">{w.vendor}</td>
                  <td className="px-4 py-3 text-ink-dim">{ROLE_LABEL[w.role] ?? w.role}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-dim">
                    {formatRelative(w.last_checked_at)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-dim">
                    {w.last_status ? (STATUS_LABEL[w.last_status] ?? w.last_status) : "Not run yet"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      aria-label={`Remove ${w.vendor}`}
                      onClick={() => void onRemove(w.id)}
                      className="rounded-md p-1.5 text-ink-faint opacity-0 transition-opacity hover:bg-p0-soft hover:text-p0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {watches.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-faint">
                    No pages yet — add the first one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
