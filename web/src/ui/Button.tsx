import type { ButtonHTMLAttributes, ReactNode } from "react";

import { focusRing } from "./focus";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  size?: "default" | "icon";
  variant?: "primary" | "secondary" | "danger" | "quiet";
}

const base = `inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border text-[13px] leading-tight font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

const sizes = {
  default: "min-h-9 px-3 py-2",
  icon: "size-7",
};

const variants = {
  primary:
    "border-emerald-700 bg-emerald-700 text-white hover:not-disabled:border-emerald-600 hover:not-disabled:bg-emerald-600 dark:border-emerald-600 dark:bg-emerald-600 dark:hover:not-disabled:border-emerald-500 dark:hover:not-disabled:bg-emerald-500",
  secondary:
    "border-neutral-200 bg-white hover:not-disabled:border-neutral-300 hover:not-disabled:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:not-disabled:border-neutral-600 dark:hover:not-disabled:bg-neutral-700",
  quiet:
    "border-transparent bg-transparent text-neutral-600 hover:not-disabled:bg-neutral-100 dark:text-neutral-400 dark:hover:not-disabled:bg-neutral-800",
  danger:
    "border-red-200 bg-red-50 text-red-700 hover:not-disabled:border-red-400 dark:border-red-900 dark:bg-red-950 dark:text-red-400 dark:hover:not-disabled:border-red-700",
};

export function Button({
  children,
  className = "",
  size = "default",
  variant = "secondary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`.trim()}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
