import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import type { IconType } from "react-icons";

/**
 * Buttons follow DESIGN.md §3.1.
 *
 *   - Shape is pill (rounded-full). A pill says press; a rectangle says report.
 *   - Solid fill in light or dark tone of its own hue.
 *   - Sizes match density: `default` = 36px admin tap target, `lg` = 48px employee.
 *   - No outline variant — outline buttons are banned (DESIGN.md §9.6).
 *   - Destructive lives in its light tone by default (DESIGN.md §3.1 rule).
 *
 * Variant selection (read this before picking `variant`):
 *
 *   primary      One per screen — the main action. White text on terracotta.
 *   secondary    Visible companion to primary (or any high-prominence action
 *                in a dense area). Dark terracotta text on peach.
 *   neutral      Cancel, dismiss, "No" next to a confirm — low-prominence.
 *                Ink text on bone. Do NOT use this for the main action on a
 *                list/table page or for "[+ Add]" triggers — those should
 *                be `secondary` so they read as branded, not as chrome.
 *   ghost        Barely-there actions (icon button, tertiary link).
 *                Ink text on transparent.
 *   destructive  ONLY on the confirm step of a destructive flow — never
 *                on the first surface. Grey with a red word; solid red on
 *                hover. Never a red fill at rest: the brand is a red too.
 *
 * Heuristic: if the button is in a footer, on a card, or is the page-level
 * add/create trigger, default to `secondary`. Reserve `neutral` for true
 * cancel / dismiss / no-confirm.
 */
type ButtonVariant =
  "primary" | "secondary" | "destructive" | "ghost" | "neutral" | "surface";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap " +
  // Named properties, not `all`, and press speed rather than enter speed: a
  // button is pressed dozens of times an hour and its colour should land under
  // the finger, not after it.
  "transition-[background-color,color,box-shadow,transform] duration-[var(--dur-press)] ease-[var(--ease)] " +
  // It gives when pressed. The scale is the system's --press, so every control
  // in the product gives by the same amount.
  "active:scale-[var(--press)] " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 " +
  "disabled:pointer-events-none disabled:opacity-50";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    // text-white! needed because base CSS resets button color to inherit, and
    // class-selector specificity loses to the `button { color: inherit }` rule
    // in lms.css without it. The `!` makes the override survive the cascade.
    "bg-[var(--color-brand-600)] text-white! hover:bg-[var(--color-brand-hover)]",
  secondary:
    "bg-[var(--color-brand-tint)] text-[var(--color-brand-700)] hover:bg-[var(--color-brand-tint-2)]",
  // Neutral at rest with the word in red, solid red only under the pointer.
  // The brand here is itself a red, so a red-filled destructive button and a
  // brand-filled primary are two red pills on one screen and the reader has to
  // work out which is which. Red is worth more as the signal on a grey button
  // than as a second fill competing with the brand.
  destructive:
    "bg-[var(--color-panel)] text-[var(--color-bad)]! hover:bg-[var(--color-bad-fill)] hover:text-white!",
  neutral:
    "bg-[var(--color-panel)] text-[var(--color-ink)] hover:bg-[var(--color-panel-2)]",
  ghost: "bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-panel)]",
  // A secondary action standing on the page ground rather than inside a card.
  // `neutral` cannot do this job: panel on the ground is 1.02:1, so the control
  // disappears. White with the card's own edge and lift reads as a control on a
  // surface that is nearly the same colour.
  surface:
    "bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-line-2)] shadow-e1 hover:bg-[var(--color-panel)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  // admin tap target = 36px
  default: "min-h-tap-admin px-5 text-sm",
  // compact row button
  sm: "min-h-8 px-3 text-sm",
  // employee tap target = 48px
  lg: "min-h-12 px-8 text-md",
  // square icon button sized to match its sibling
  icon: "min-h-tap-admin min-w-tap-admin px-0",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * The button's mark, drawn after the label. It is a prop rather than a child so
   * the side is the component's decision and not each call site's: the label is
   * what the reader is scanning for, and a mark in front of it makes the eye step
   * over the mark to reach the word. Pass a component or a registry name.
   */
  icon?: IconType | string;
}

/**
 * The button's classes, without the button. For a `<Link>` that acts as a button
 * and for the decorative pill inside a card-wide link, where a nested <button>
 * would be invalid HTML. Same source, so they cannot drift.
 */
export function buttonClassName({
  variant = "primary",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(BASE, variantClasses[variant], sizeClasses[size], className);
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "default",
      type = "button",
      icon,
      children,
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        data-slot="button"
        className={buttonClassName({ variant, size, className })}
        {...props}
      >
        {children}
        {icon ? <Icon icon={icon} className="text-base" /> : null}
      </button>
    );
  },
);
