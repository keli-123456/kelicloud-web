import * as React from "react"
import { AlertCircle, Info, TriangleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

type WarningAlertTone = "warning" | "destructive" | "info"

type WarningAlertProps = Omit<React.ComponentProps<typeof Alert>, "title"> & {
  tone?: WarningAlertTone
  title?: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
}

const toneStyles: Record<
  WarningAlertTone,
  {
    root: string
    icon: string
    title: string
    description: string
  }
> = {
  warning: {
    root: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-50",
    icon: "text-amber-600 dark:text-amber-300",
    title: "text-amber-950 dark:text-amber-50",
    description: "text-amber-800/90 dark:text-amber-100/80",
  },
  destructive: {
    root: "border-red-200 bg-red-50 text-red-950 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-50",
    icon: "text-red-600 dark:text-red-300",
    title: "text-red-950 dark:text-red-50",
    description: "text-red-800/90 dark:text-red-100/80",
  },
  info: {
    root: "border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-50",
    icon: "text-sky-600 dark:text-sky-300",
    title: "text-sky-950 dark:text-sky-50",
    description: "text-sky-800/90 dark:text-sky-100/80",
  },
}

const toneIcons = {
  warning: TriangleAlert,
  destructive: AlertCircle,
  info: Info,
} satisfies Record<WarningAlertTone, React.ComponentType<{ className?: string }>>

function WarningAlert({
  className,
  tone = "warning",
  title,
  description,
  icon,
  children,
  ...props
}: WarningAlertProps) {
  const styles = toneStyles[tone]
  const ToneIcon = toneIcons[tone]

  return (
    <Alert className={cn(styles.root, className)} {...props}>
      {icon ?? <ToneIcon className={cn("mt-0.5", styles.icon)} />}
      {title ? <AlertTitle className={styles.title}>{title}</AlertTitle> : null}
      {description || children ? (
        <AlertDescription className={styles.description}>
          {description ?? children}
        </AlertDescription>
      ) : null}
    </Alert>
  )
}

export { WarningAlert, type WarningAlertTone }
