import type { SVGProps } from "react";

type IconName =
  | "register"
  | "plus"
  | "edit"
  | "trash"
  | "back"
  | "info"
  | "check"
  | "alert"
  | "spinner";

const paths: Record<IconName, React.ReactNode> = {
  register: (
    <>
      <rect x="4" y="7" width="12" height="14" rx="1.5" />
      <path d="M8 7V3h12v14h-4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  edit: (
    <>
      <path d="m15 5 4 4M4 20l4-1 12-12a2.8 2.8 0 0 0-4-4L4 15z" />
    </>
  ),
  trash: (
    <>
      <path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" />
    </>
  ),
  back: <path d="m10 5-7 7 7 7M3 12h18" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7h.01" />
    </>
  ),
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  alert: (
    <>
      <path d="m10.3 4-8 14a1.8 1.8 0 0 0 1.6 3h16.2a1.8 1.8 0 0 0 1.6-3l-8-14a1.9 1.9 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  spinner: <path d="M21 12a9 9 0 1 1-9-9" />,
};

export function Icon({
  name,
  className = "",
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`icon ${name === "spinner" ? "spin" : ""} ${className}`}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
