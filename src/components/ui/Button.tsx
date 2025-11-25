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
        primary: "bg-primary-600 text-white hover:bg-primary-700 hover:shadow-md focus:ring-primary-500 dark:bg-primary-600 dark:hover:bg-primary-500",
        secondary: "bg-secondary-500 text-white hover:bg-secondary-600 hover:shadow-md focus:ring-secondary-500",
        accent: "bg-accent-600 text-white hover:bg-accent-700 hover:shadow-md focus:ring-accent-500",
        outline: "bg-transparent text-primary-700 border-2 border-primary-200 hover:bg-primary-50 hover:border-primary-300 focus:ring-primary-500 dark:text-primary-200 dark:border-primary-700 dark:hover:bg-primary-800 dark:hover:border-primary-600",
        ghost: "bg-transparent text-primary-700 hover:bg-primary-100 focus:ring-primary-500 dark:text-primary-200 dark:hover:bg-primary-800",
        danger: "bg-error-600 text-white hover:bg-error-700 hover:shadow-md focus:ring-error-500",
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
