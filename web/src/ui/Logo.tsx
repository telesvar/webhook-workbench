interface LogoProps {
  className?: string;
}

export function Logo({ className = "size-6" }: LogoProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.4}
      viewBox="0 0 24 24"
    >
      <circle cx="4.5" cy="6.5" fill="currentColor" r="2.2" stroke="none" />
      <path d="M7.2 6.5h6.8a5.3 5.3 0 0 1 0 10.6H8.2" />
      <path d="m11.2 14-3 3.1 3 3.1" />
    </svg>
  );
}
