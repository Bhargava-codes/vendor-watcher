import { cn } from "@/lib/utils";

export function MooringLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-primary-foreground">
        <svg
          aria-hidden="true"
          className="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="6.5" r="3.5" />
          <path d="M12 10v10" />
          <path d="M6 15a6 6 0 0 0 12 0" />
          <path d="M9 13h6" />
        </svg>
      </span>
      <span className="text-sm font-semibold tracking-tight text-ink">Mooring</span>
      <span className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[9px] font-medium text-ink-faint">
        BETA
      </span>
    </span>
  );
}
