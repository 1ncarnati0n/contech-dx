'use client';

import * as React from "react"
import { motion, type HTMLMotionProps } from "framer-motion"
import { cn } from "@/lib/utils"

// Card props 타입 정의
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, hover, children, ...props }, ref) => {
    const baseClassName = cn(
      "rounded-md border border-zinc-200 bg-white text-zinc-950 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 transition-colors",
      hover && "hover:border-accent-400 dark:hover:border-accent-600",
      className
    );

    if (hover) {
      // motion.div에 전달할 props 추출 (HTML 속성만)
      const { onClick, onMouseEnter, onMouseLeave, style, id, role, tabIndex, 'aria-label': ariaLabel, ...rest } = props;

      // motion.div용 props 구성
      const motionProps: HTMLMotionProps<"div"> = {
        onClick,
        onMouseEnter,
        onMouseLeave,
        style,
        id,
        role,
        tabIndex,
        'aria-label': ariaLabel,
      };

      // undefined 값 제거
      Object.keys(motionProps).forEach((key) => {
        if (motionProps[key as keyof typeof motionProps] === undefined) {
          delete motionProps[key as keyof typeof motionProps];
        }
      });

      return (
        <motion.div
          ref={ref}
          className={baseClassName}
          initial="rest"
          whileHover="hover"
          variants={{
            rest: {
              y: 0,
              boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
              borderColor: "var(--color-zinc-200)",
            },
            hover: {
              y: -2,
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
              borderColor: "var(--color-zinc-300)",
              transition: {
                duration: 0.2,
                ease: "easeOut",
              },
            },
          }}
          {...motionProps}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div
        ref={ref}
        className={baseClassName}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-zinc-500 dark:text-zinc-400", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
