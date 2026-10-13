// Inline icons for the plugin UI. Stroke icons inherit currentColor.
import type { ReactNode } from "react";

const Stroke = ({ children, width = 2 }: { children: ReactNode; width?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

// The web app's mark (src/assets/sidebar/logo.svg) without its white tile.
export const LogoMark = () => (
  <svg viewBox="8 11 34 28" fill="#0a144b" aria-hidden="true">
    <path d="M24.46 17.2H14.06V12h10.4zM14.04 28.79h-5.2V17.2h5.2zM24.46 38H14.06v-5.2h10.4zM14.04 32.8h-5.2v-5.2h5.2zM41.15 17.2h-5.28V12h5.28zM35.87 28.79h-5.2V17.2h5.2zM41.15 38h-5.28v-5.2h5.28zM35.87 32.8h-5.2v-5.2h5.2z" />
  </svg>
);

export const KeyIcon = () => (
  <Stroke width={1.9}>
    <circle cx="8" cy="15" r="4" />
    <path d="m10.8 12.2 8.7-8.7M16.5 6.5l2.5 2.5M14 9l2 2" />
  </Stroke>
);

export const PlusIcon = () => (
  <Stroke>
    <path d="M12 5v14M5 12h14" />
  </Stroke>
);

export const SparkIcon = () => (
  <Stroke width={1.9}>
    <path d="M12 3.5 13.9 9a2 2 0 0 0 1.2 1.2l5.4 1.8-5.4 1.9a2 2 0 0 0-1.2 1.2L12 20.5l-1.9-5.4a2 2 0 0 0-1.2-1.2L3.5 12l5.4-1.8A2 2 0 0 0 10.1 9z" />
  </Stroke>
);

export const PullIcon = () => (
  <Stroke>
    <path d="M17 7 7 17M7 9v8h8" />
  </Stroke>
);

export const InsertIcon = () => (
  <Stroke>
    <path d="M7 17 17 7M9 7h8v8" />
  </Stroke>
);

export const CloseIcon = () => (
  <Stroke>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Stroke>
);

export const InfoIcon = () => (
  <Stroke>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 7.8v.2" />
  </Stroke>
);

export const EyeIcon = ({ off }: { off?: boolean }) => (
  <Stroke>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
    {off && <path d="m4 4 16 16" />}
  </Stroke>
);

export const ArrowIcon = () => (
  <Stroke>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Stroke>
);

export const ExternalIcon = () => (
  <Stroke>
    <path d="M14 5h5v5M19 5l-8 8M18 14v4a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 18V7.5A1.5 1.5 0 0 1 6.5 6H10" />
  </Stroke>
);

/* ---- section tabs ---- */
export const TagIcon = () => (
  <Stroke width={1.9}>
    <path d="M3.5 12.6V5a1.5 1.5 0 0 1 1.5-1.5h7.6a1.5 1.5 0 0 1 1 .44l7 7a1.5 1.5 0 0 1 0 2.12l-7.6 7.6a1.5 1.5 0 0 1-2.12 0l-7-7a1.5 1.5 0 0 1-.38-1.06z" />
    <circle cx="8.2" cy="8.2" r="1.4" />
  </Stroke>
);

export const BoltIcon = () => (
  <Stroke width={1.9}>
    <path d="M13 3 5 13.5h6L10.5 21 19 10.5h-6z" />
  </Stroke>
);

export const CheckCircleIcon = () => (
  <Stroke width={1.9}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.2 12.3 2.6 2.6 5-5.4" />
  </Stroke>
);

/* ---- channels ---- */
export const MailIcon = () => (
  <Stroke width={1.9}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="3" />
    <path d="m4.5 7.5 7.5 5.5 7.5-5.5" />
  </Stroke>
);

export const ChatIcon = () => (
  <Stroke width={1.9}>
    <path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4.5 19.5l1.4-4.1A7.5 7.5 0 1 1 20 11.5z" />
  </Stroke>
);

export const GlobeIcon = () => (
  <Stroke width={1.9}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5S9.7 5.9 12 3.5z" />
  </Stroke>
);

export const MegaphoneIcon = () => (
  <Stroke width={1.9}>
    <path d="M4 10v4a1 1 0 0 0 1 1h2l6 4V5L7 9H5a1 1 0 0 0-1 1zM17 9a4 4 0 0 1 0 6" />
  </Stroke>
);

export const BoxIcon = () => (
  <Stroke width={1.9}>
    <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
    <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
  </Stroke>
);

// Figma's mark, for the "link your account" illustration.
export const FigmaLogo = () => (
  <svg viewBox="0 0 38 57" aria-hidden="true">
    <path fill="#1abcfe" d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" />
    <path fill="#0acf83" d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" />
    <path fill="#ff7262" d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" />
    <path fill="#f24e1e" d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" />
    <path fill="#a259ff" d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" />
  </svg>
);
