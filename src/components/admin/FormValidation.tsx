import { createContext, useContext, useEffect, useId, useRef, type ReactNode } from "react";

export class FieldValidationError extends Error {
  field: string;
  planID?: string;
  constructor(message: string, field: string, planID?: string) {
    super(message);
    this.name = "FieldValidationError";
    this.field = field;
    this.planID = planID;
  }
}

const ValidationContext = createContext<Error | null>(null);
export const FormValidationProvider = ValidationContext.Provider;

export function FormValidationSummary() {
  const error = useContext(ValidationContext);
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!error || error instanceof FieldValidationError) return;
    const frame = requestAnimationFrame(() => {
      if (!ref.current?.getClientRects().length) return;
      ref.current.scrollIntoView({ block: "nearest" });
      ref.current.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [error]);
  return error ? <p ref={ref} tabIndex={-1} role="alert" className="mb-3 break-words border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-sm text-destructive outline-none">{error.message}</p> : null;
}

export function ValidationField({ field, children, className }: { field: string; children: ReactNode; className?: string }) {
  const error = useContext(ValidationContext);
  const invalid = error instanceof FieldValidationError && error.field === field;
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!invalid || !ref.current) return;
    // Radix selects and native inputs share the same field-level error contract.
    const control = ref.current.querySelector<HTMLElement>('input:not([type="hidden"]):not(:disabled), textarea:not(:disabled), button[role="combobox"]:not(:disabled), button:not(:disabled)');
    const previousDescription = control?.getAttribute("aria-describedby");
    const previousInvalid = control?.getAttribute("aria-invalid");
    control?.setAttribute("aria-invalid", "true");
    control?.setAttribute("aria-describedby", [previousDescription, id].filter(Boolean).join(" "));
    const frame = requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ block: "nearest" });
      (control ?? ref.current)?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      if (previousInvalid === null) control?.removeAttribute("aria-invalid");
      else if (previousInvalid) control?.setAttribute("aria-invalid", previousInvalid);
      if (previousDescription) control?.setAttribute("aria-describedby", previousDescription);
      else control?.removeAttribute("aria-describedby");
    };
  }, [invalid, error, id]);
  return <div ref={ref} tabIndex={invalid ? -1 : undefined} className={className} data-validation-field={field}>
    {children}
    {invalid ? <p id={id} className="mt-1 text-xs text-destructive">{error.message}</p> : null}
  </div>;
}
