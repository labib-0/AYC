import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "icon";
  size?: "sm" | "md" | "lg" | "icon";
  fullWidth?: boolean;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  ...props
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center font-sans font-semibold transition-all duration-200 cursor-pointer disabled:pointer-events-none disabled:opacity-50 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const variantClasses = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] shadow-xs",
    secondary: "border border-input bg-secondary text-foreground hover:bg-secondary/80 active:scale-[0.98]",
    outline: "border border-border/80 bg-transparent text-foreground hover:bg-secondary/60 hover:border-foreground/40 active:scale-[0.98]",
    ghost: "bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50",
    icon: "bg-transparent text-foreground hover:bg-secondary/70 border border-border/60 rounded-full",
  };

  const sizeClasses = {
    sm: "rounded-lg px-3.5 py-1.5 text-xs uppercase tracking-wider",
    md: "rounded-xl px-6 py-2.5 text-sm uppercase tracking-wider",
    lg: "rounded-xl px-7 py-3 text-base uppercase tracking-wider",
    icon: "p-2 rounded-full",
  };

  const resolvedSizeClass = variant === "icon" ? sizeClasses.icon : sizeClasses[size];
  const widthClass = fullWidth ? "w-full" : "";

  const rootClass = `${baseClasses} ${variantClasses[variant]} ${resolvedSizeClass} ${widthClass} ${className}`;

  return (
    <button className={rootClass.trim()} {...props}>
      {children}
    </button>
  );
}
