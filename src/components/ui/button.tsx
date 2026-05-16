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
    return "button-secondary";
  }

  if (variant === "ghost") {
    return "button-ghost";
  }

  return "button-primary";
}

export function Button(props: ButtonProps) {
  const variant = props.variant ?? "primary";
  const className = [
    "button-shell inline-flex min-h-11 items-center justify-center gap-2 px-5 py-3 text-sm font-medium tracking-[0.01em]",
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
