import React, { ButtonHTMLAttributes, CSSProperties } from "react";
import { useFayda } from "../hooks/useFayda.js";
import { LOGO_WHITE, LOGO_WHITE_ALL, LOGO_WHITE_TYPE } from "../assets.js";

// ─── Public types ────────────────────────────────────────────────────────────

/**
 * Which icon/logo variant to render on the button.
 *
 * - `"mark"`     → the Fayda symbol/icon only (99×94 – good for compact/square buttons)
 * - `"wordmark"` → the "Fayda" text logo only (153×76 – good for icon-free layouts)
 * - `"full"`     → symbol + full wordmark side-by-side (256×99 – default, most recognisable)
 */
export type FaydaLogoVariant = "mark" | "wordmark" | "full";

/**
 * Colour theme of the button.
 *
 * - `"dark"`  → Ethiopian-green background with white logo + text (default)
 * - `"light"` → White background with green border and green text, white icon on green circle
 */
export type FaydaButtonTheme = "dark" | "light";

export interface FaydaLoginButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Which of the 3 Fayda logo assets to display. Default: `"full"` */
  logoVariant?: FaydaLogoVariant;
  /** Colour theme. Default: `"dark"` */
  theme?: FaydaButtonTheme;
  /** OIDC claims to request on login */
  claims?: Record<string, unknown>;
  /** Button label. Default: `"Sign in with Fayda ID"` */
  label?: string;
}

// ─── Design tokens ───────────────────────────────────────────────────────────

const FAYDA_GREEN = "#007A4D"; // Ethiopian-flag green
const FAYDA_GREEN_DARK = "#005C3A"; // hover/active shade
const FAYDA_GREEN_LIGHT = "#E6F4EE"; // light-theme background tint

// ─── Logo asset map ──────────────────────────────────────────────────────────

const LOGO_SRC: Record<FaydaLogoVariant, string> = {
  mark: LOGO_WHITE,
  wordmark: LOGO_WHITE_TYPE,
  full: LOGO_WHITE_ALL,
};

// Natural aspect ratios (width / height of each asset)
const LOGO_ASPECT: Record<FaydaLogoVariant, number> = {
  mark: 99 / 94,
  wordmark: 153 / 76,
  full: 256 / 99,
};

// How tall (px) to render the logo inside the button
const LOGO_HEIGHT_PX = 22;

// ─── Component ───────────────────────────────────────────────────────────────

export function FaydaLoginButton({
  logoVariant = "full",
  theme = "dark",
  claims,
  label = "Sign in with Fayda",
  onClick,
  disabled,
  style,
  ...rest
}: FaydaLoginButtonProps) {
  const { login, isLoading } = useFayda();
  const [hovered, setHovered] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (!e.defaultPrevented) {
      await login(claims);
    }
  };

  const isDark = theme === "dark";
  const isDisabled = isLoading || disabled;

  // ── Base button styles (Google-style: pill shape, shadow, transitions) ──
  const buttonStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: logoVariant === "mark" ? 0 : "10px",
    padding: logoVariant === "mark" ? "10px 14px" : "10px 20px 10px 14px",
    borderRadius: "6px",
    border: isDark ? "none" : `1.5px solid ${FAYDA_GREEN}`,
    cursor: isDisabled ? "not-allowed" : "pointer",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: "15px",
    fontWeight: 600,
    letterSpacing: "0.01em",
    lineHeight: 1,
    userSelect: "none",
    whiteSpace: "nowrap",
    transition:
      "background-color 120ms ease, box-shadow 120ms ease, opacity 120ms ease",
    outline: "none",
    textDecoration: "none",
    opacity: isDisabled ? 0.6 : 1,
    // Colours
    backgroundColor: isDark
      ? pressed
        ? FAYDA_GREEN_DARK
        : hovered
          ? "#006040"
          : FAYDA_GREEN
      : pressed
        ? FAYDA_GREEN_LIGHT
        : hovered
          ? "#F0FAF5"
          : "#ffffff",
    color: isDark ? "#ffffff" : FAYDA_GREEN,
    // Shadow
    boxShadow: isDark
      ? hovered && !isDisabled
        ? "0 2px 8px rgba(0,122,77,0.45)"
        : "0 1px 3px rgba(0,0,0,0.20)"
      : hovered && !isDisabled
        ? "0 2px 8px rgba(0,122,77,0.18)"
        : "0 1px 3px rgba(0,0,0,0.10)",
    ...style,
  };

  // ── Icon container: for light theme, put icon on a green circle ──
  const iconWrapStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    ...(isDark
      ? {}
      : logoVariant !== "wordmark"
        ? {
            backgroundColor: FAYDA_GREEN,
            borderRadius: "4px",
            padding: "4px 5px",
            margin: "-2px 0",
          }
        : {}),
  };

  const logoWidth = LOGO_ASPECT[logoVariant] * LOGO_HEIGHT_PX;

  const logoImg = (
    <img
      src={LOGO_SRC[logoVariant]}
      alt="Fayda logo"
      width={logoWidth}
      height={LOGO_HEIGHT_PX}
      style={{ display: "block", objectFit: "contain" }}
      draggable={false}
    />
  );

  // For the "wordmark" variant in light theme, tint the white wordmark green
  const wordmarkStyle: CSSProperties =
    !isDark && logoVariant === "wordmark"
      ? {
          filter:
            "invert(27%) sepia(82%) saturate(510%) hue-rotate(122deg) brightness(90%) contrast(102%)",
        }
      : {};

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={buttonStyle}
      aria-label={isLoading ? "Redirecting to Fayda…" : label}
      {...rest}
    >
      {/* Logo */}
      <span style={iconWrapStyle}>
        <span style={wordmarkStyle}>{logoImg}</span>
      </span>

      {/* Text label — hidden when using mark-only variant */}
      {logoVariant !== "mark" && (
        <span style={{ pointerEvents: "none" }}>
          {isLoading ? "Redirecting…" : label}
        </span>
      )}

      {/* Spinner (shown while redirecting in mark-only mode) */}
      {logoVariant === "mark" && isLoading && (
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 14,
            height: 14,
            border: "2px solid rgba(255,255,255,0.4)",
            borderTopColor: "#fff",
            borderRadius: "50%",
            animation: "faydaSpin 0.7s linear infinite",
            marginLeft: 6,
          }}
        />
      )}
    </button>
  );
}
