import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const variants = {
    primary:
      "bg-brand text-white hover:bg-brand-strong shadow-[0_6px_20px_rgba(91,75,255,0.35)]",
    ghost: "bg-transparent text-ink-soft hover:bg-surface-2",
    outline: "border border-border bg-surface text-ink hover:bg-surface-2",
    danger: "bg-danger text-white hover:brightness-95",
  } as const;
  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-11 px-5 text-sm",
    lg: "h-14 px-7 text-base",
  } as const;
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-card bg-surface shadow-[var(--shadow-soft)] border border-border",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-xl border border-border bg-surface px-4 text-ink placeholder:text-ink-faint outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30",
        className
      )}
      {...props}
    />
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
      {children}
    </span>
  );
}
