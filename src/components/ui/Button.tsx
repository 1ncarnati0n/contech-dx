import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-slate-700 text-white hover:bg-slate-800 hover:shadow-md focus:ring-slate-500",
        secondary: "bg-cyan-600 text-white hover:bg-cyan-700 hover:shadow-md focus:ring-cyan-500",
        accent: "bg-orange-600 text-white hover:bg-orange-700 hover:shadow-md focus:ring-orange-500",
        outline: "bg-white text-slate-700 border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 focus:ring-slate-500",
        ghost: "bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-500",
        danger: "bg-red-600 text-white hover:bg-red-700 hover:shadow-md focus:ring-red-500",
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-base",
        lg: "px-6 py-3 text-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      children,
      loading = false,
      icon,
      iconPosition = "left",
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    // asChild 사용 시 children을 그대로 전달 (Slot은 단일 자식만 허용)
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    // 일반 버튼일 때는 loading, icon 등을 렌더링
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && icon && iconPosition === "left" && icon}
        {children}
        {!loading && icon && iconPosition === "right" && icon}
      </Comp>
    );
  }
);

Button.displayName = "Button";
