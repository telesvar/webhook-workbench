import type { ReactNode } from "react";

interface IconProps {
  children: ReactNode;
  className?: string;
  viewBox?: string;
}

export function Icon({ children, className = "size-4", viewBox = "0 0 20 20" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.6}
      viewBox={viewBox}
    >
      {children}
    </svg>
  );
}
