import * as React from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

import { ThemeContext } from "@/contexts/ThemeContext"
import { useSystemTheme } from "@/hooks/useSystemTheme"

const Toaster = ({ ...props }: ToasterProps) => {
  const { appearance } = React.useContext(ThemeContext)
  const resolvedAppearance = useSystemTheme(appearance)

  return (
    <Sonner
      position={props.position ?? "top-center"}
      theme={resolvedAppearance as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
