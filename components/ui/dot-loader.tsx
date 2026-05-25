import { cn } from "@/lib/utils";

type DotLoaderProps = {
  label?: string;
  className?: string;
};

export function DotLoader({ label = "Loading", className }: DotLoaderProps) {
  return (
    <div className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)} role="status" aria-live="polite">
      <span>{label}</span>
      <span className="inline-flex items-center gap-1">
        <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-current" />
      </span>
    </div>
  );
}
