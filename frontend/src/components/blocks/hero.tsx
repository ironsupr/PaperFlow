"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

export interface HeroProps extends React.HTMLAttributes<HTMLElement> {
  gradient?: boolean
  title: string
  subtitle?: string
  actions?: {
    label: string
    href: string
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  }[]
  titleClassName?: string
  subtitleClassName?: string
  actionsClassName?: string
}

const Hero = React.forwardRef<HTMLElement, HeroProps>(
  (
    {
      className,
      gradient = false,
      title,
      subtitle,
      actions,
      titleClassName,
      subtitleClassName,
      actionsClassName,
      ...props
    },
    ref,
  ) => {
    return (
      <section
        ref={ref}
        className={cn(
          "relative z-0 flex min-h-[70vh] w-full flex-col items-center justify-center overflow-hidden bg-background",
          className,
        )}
        {...props}
      >
        {gradient && (
          <div className="absolute inset-0 z-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 blur-[120px] rounded-full" />
          </div>
        )}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease: "easeOut", duration: 0.8 }}
          className="relative z-50 container flex flex-col items-center px-6"
        >
          <div className="flex flex-col items-center text-center max-w-5xl">
            <h1
              className={cn(
                "text-5xl md:text-7xl font-semibold tracking-tight text-foreground leading-tight",
                titleClassName,
              )}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className={cn(
                  "mt-8 text-lg md:text-xl text-muted-foreground font-medium max-w-3xl leading-relaxed",
                  subtitleClassName,
                )}
              >
                {subtitle}
              </p>
            )}
            {actions && actions.length > 0 && (
              <div className={cn("mt-12 flex flex-wrap justify-center gap-5", actionsClassName)}>
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || "default"}
                    asChild
                    className={cn(
                      "px-8 py-6 text-sm font-semibold rounded-sm transition-all",
                      action.variant === "default" ? "bg-foreground text-background hover:opacity-90" : "border-border hover:bg-accent"
                    )}
                  >
                    <Link to={action.href}>{action.label}</Link>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </section>
    )
  },
)
Hero.displayName = "Hero"

export { Hero }
