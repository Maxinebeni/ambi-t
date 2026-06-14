export function Logo({ className = "", variant = "dark" }: { className?: string; variant?: "dark" | "light" }) {
  const textColor = variant === "light" ? "#FFFFFF" : "#0D1B2A";
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#0D1B2A" />
        <path d="M9 22L16 8L23 22H20L18.5 19H13.5L12 22H9Z" fill="#5CB85C" />
        <circle cx="23" cy="9" r="3" fill="#5CB85C" />
      </svg>
      <span className="font-semibold text-lg tracking-tight" style={{ color: textColor }}>
        Ambi<span style={{ color: "#5CB85C" }}>-</span>Tech
      </span>
    </div>
  );
}
