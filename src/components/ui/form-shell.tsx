import * as React from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormSectionProps = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  advanced?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
  toggleLabel?: React.ReactNode;
};

function FormSection({
  title,
  description,
  children,
  className,
  contentClassName,
  advanced = false,
  collapsible,
  defaultOpen,
  toggleLabel,
}: FormSectionProps) {
  const shouldCollapse = collapsible ?? advanced;
  const [open, setOpen] = React.useState(defaultOpen ?? !shouldCollapse);

  const sectionContent = (
    <div className={cn("space-y-4", contentClassName)}>
      {(title || description) ? (
        <div className="space-y-1">
          {title ? (
            <div className="text-sm font-semibold text-foreground">{title}</div>
          ) : null}
          {description ? (
            <div className="text-sm text-muted-foreground">{description}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );

  if (!shouldCollapse) {
    return (
      <section className={cn("rounded-lg border border-border/60 bg-card p-4", className)}>
        {sectionContent}
      </section>
    );
  }

  return (
    <section className={cn("rounded-lg border border-border/60 bg-card p-4", className)}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground"
          >
            <ChevronDown
              className={cn("size-4 transition-transform", open ? "rotate-180" : "")}
            />
            {toggleLabel ?? title ?? "Advanced"}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          {sectionContent}
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

type FormFieldProps = {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  children?: React.ReactNode;
  className?: string;
};

function FormField({
  label,
  description,
  error,
  htmlFor,
  required,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
          {required ? <span className="ml-1 text-destructive">*</span> : null}
        </Label>
      ) : null}
      {children}
      {description ? <FormHelpText>{description}</FormHelpText> : null}
      {error ? <FormErrorText>{error}</FormErrorText> : null}
    </div>
  );
}

function FormHelpText({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function FormErrorText({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      role="alert"
      className={cn("text-xs font-medium text-destructive", className)}
      {...props}
    />
  );
}

function FormActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function FormShell({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("space-y-4", className)} {...props} />;
}

export {
  FormShell,
  FormSection,
  FormField,
  FormActions,
  FormHelpText,
  FormErrorText,
};
