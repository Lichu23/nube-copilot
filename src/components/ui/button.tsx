import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type ButtonVariant = "ink" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const baseStyles =
  "inline-flex items-center justify-center gap-2 font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";

const variantStyles: Record<ButtonVariant, string> = {
  ink: "bg-ink-navy !text-white hover:bg-brand-teal-dark disabled:bg-muted-foreground disabled:!text-white",
  outline: "border border-border bg-card text-foreground hover:border-border-strong hover:bg-surface-muted",
  ghost: "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "rounded-xl px-4 py-2 text-sm",
  md: "rounded-[1rem] px-5 py-3 text-sm",
  lg: "rounded-[1rem] px-7 py-4 text-sm",
  icon: "h-10 w-10 rounded-full p-0",
};

export function buttonStyles({
  className,
  size = "md",
  variant = "ink",
}: {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
} = {}) {
  return cn(baseStyles, variantStyles[variant], sizeStyles[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export function Button({ className, size, variant, ...props }: ButtonProps) {
  return <button className={buttonStyles({ className, size, variant })} {...props} />;
}

type ButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export function ButtonLink({ className, href, size, variant, ...props }: ButtonLinkProps) {
  return <Link href={href} className={buttonStyles({ className, size, variant })} {...props} />;
}
