import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface BaseButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
}

type ButtonProps =
  | (BaseButtonProps &
      ComponentPropsWithoutRef<"button"> & {
        href?: never;
      })
  | (BaseButtonProps & {
      href: string;
    });

function getVariantClasses(variant: ButtonVariant): string {
  if (variant === "secondary") {
    return "border border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--foreground)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-strong)]";
  }

  if (variant === "ghost") {
    return "border border-transparent bg-transparent text-[color:var(--muted-foreground)] hover:border-[color:var(--border)] hover:bg-white/4 hover:text-[color:var(--foreground)]";
  }

  return "brass-ring border border-[color:var(--border-strong)] bg-[color:var(--interactive-primary)] text-[color:var(--interactive-primary-foreground)] hover:bg-[color:var(--color-brass-400)]";
}

export function Button(props: ButtonProps) {
  const variant = props.variant ?? "primary";
  const className = [
    "button-shell inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium tracking-[0.01em]",
    getVariantClasses(variant),
    props.className ?? "",
  ]
    .join(" ")
    .trim();

  if ("href" in props && props.href) {
    return (
      <Link className={className} href={props.href}>
        {props.children}
      </Link>
    );
  }

  const { children, variant: _variant, className: _className, ...rest } = props;
  return (
    <button className={className} {...rest}>
      {children}
    </button>
  );
}
