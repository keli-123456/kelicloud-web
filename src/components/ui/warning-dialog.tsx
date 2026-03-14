import * as React from "react"
import { AlertCircle, TriangleAlert } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

type WarningDialogTone = "warning" | "destructive"

type WarningDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title: React.ReactNode
  description?: React.ReactNode
  confirmLabel?: React.ReactNode
  cancelLabel?: React.ReactNode
  tone?: WarningDialogTone
  children?: React.ReactNode
}

type ConfirmDialogOptions = Omit<
  WarningDialogProps,
  "open" | "onOpenChange" | "onConfirm"
>

type ConfirmDialogRequest = ConfirmDialogOptions & {
  resolve: (confirmed: boolean) => void
}

const toneStyles: Record<
  WarningDialogTone,
  {
    panel: string
    iconWrap: string
    icon: string
    action: string
  }
> = {
  warning: {
    panel: "border-amber-200/80 dark:border-amber-900/50",
    iconWrap: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
    icon: "text-amber-700 dark:text-amber-200",
    action:
      "bg-amber-500 text-amber-950 hover:bg-amber-500/90 focus-visible:ring-amber-500/30 dark:bg-amber-400 dark:text-amber-950",
  },
  destructive: {
    panel: "border-red-200/80 dark:border-red-900/50",
    iconWrap: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200",
    icon: "text-red-700 dark:text-red-200",
    action: "bg-destructive text-white hover:bg-destructive/90",
  },
}

function WarningDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  tone = "destructive",
  children,
}: WarningDialogProps) {
  const styles = toneStyles[tone]
  const Icon = tone === "warning" ? TriangleAlert : AlertCircle

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn("sm:max-w-md", styles.panel)}>
        <AlertDialogHeader className="gap-4 text-left">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                styles.iconWrap
              )}
            >
              <Icon className={cn("size-5", styles.icon)} />
            </div>
            <div className="min-w-0 space-y-1">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              {description ? (
                <AlertDialogDescription className="text-sm leading-6">
                  {description}
                </AlertDialogDescription>
              ) : null}
            </div>
          </div>
          {children ? <div className="pl-[3.25rem]">{children}</div> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction className={styles.action} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function useWarningDialog() {
  const requestRef = React.useRef<ConfirmDialogRequest | null>(null)
  const [request, setRequest] = React.useState<ConfirmDialogRequest | null>(null)

  const settle = React.useCallback((confirmed: boolean) => {
    const current = requestRef.current
    if (!current) return
    requestRef.current = null
    setRequest(null)
    current.resolve(confirmed)
  }, [])

  const confirm = React.useCallback(
    (options: ConfirmDialogOptions) =>
      new Promise<boolean>((resolve) => {
        const nextRequest = { ...options, resolve }
        requestRef.current = nextRequest
        setRequest(nextRequest)
      }),
    []
  )

  const dialog = (
    <WarningDialog
      open={Boolean(request)}
      onOpenChange={(open) => {
        if (!open) settle(false)
      }}
      onConfirm={() => settle(true)}
      title={request?.title ?? ""}
      description={request?.description}
      confirmLabel={request?.confirmLabel}
      cancelLabel={request?.cancelLabel}
      tone={request?.tone}
    >
      {request?.children}
    </WarningDialog>
  )

  return { confirm, dialog }
}

export { WarningDialog, useWarningDialog, type ConfirmDialogOptions, type WarningDialogTone }
