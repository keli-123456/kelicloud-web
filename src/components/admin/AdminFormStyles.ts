const ADMIN_FORM_DIALOG_CLASS =
  "admin-dialog flex max-h-[min(92vh,calc(100dvh-1.5rem))] w-[calc(100vw-1.5rem)] max-w-5xl flex-col overflow-hidden sm:max-w-5xl";

const ADMIN_FORM_DIALOG_WIDE_CLASS =
  "admin-dialog flex max-h-[min(94vh,calc(100dvh-1.5rem))] w-[calc(100vw-1.5rem)] max-w-[96rem] flex-col overflow-hidden sm:max-w-[96rem]";

const ADMIN_FORM_DIALOG_CHROME_CLASS =
  "admin-dialog gap-0 overflow-hidden p-0";

const ADMIN_FORM_HEADER_CLASS =
  "admin-panel-header shrink-0 px-5 py-4";

const ADMIN_FORM_HEADER_INSET_CLASS =
  "flex min-w-0 flex-col gap-1 pr-12";

const ADMIN_FORM_SCROLL_CLASS =
  "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1 [scrollbar-gutter:stable]";

const ADMIN_FORM_BODY_CLASS =
  "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-4 [scrollbar-gutter:stable]";

const ADMIN_FORM_FOOTER_CLASS =
  "admin-panel-footer flex shrink-0 flex-col-reverse gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-end";

const ADMIN_FORM_SECTION_CLASS =
  "border-t border-border/70 pt-4 first:border-t-0 first:pt-0";

const ADMIN_FORM_SECTION_COMPACT_CLASS =
  "border-t border-border/70 pt-3 first:border-t-0 first:pt-0";

const ADMIN_FORM_FIELD_CLASS =
  "grid min-w-0 gap-1.5 [&>[data-slot=label]]:min-w-0 [&>[data-slot=label]]:overflow-hidden [&>[data-slot=label]]:text-ellipsis [&>[data-slot=label]]:leading-5";

const ADMIN_FORM_LABEL_CLASS =
  "text-[13px] font-semibold leading-5 text-foreground";

const ADMIN_FORM_HELP_CLASS =
  "text-[12px] leading-5 text-muted-foreground";

const ADMIN_FORM_CONTEXT_CARD_CLASS =
  "rounded-md border border-border bg-[var(--surface-subtle)] px-3 py-2.5 text-sm";

const ADMIN_FORM_GRID_2_CLASS = "grid items-start gap-3 md:grid-cols-2";
const ADMIN_FORM_GRID_3_CLASS = "grid items-start gap-3 md:grid-cols-3";
const ADMIN_FORM_GRID_4_CLASS = "grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4";

const ADMIN_FORM_TOGGLE_CLASS =
  "flex min-h-10 items-center justify-between gap-3 border-b border-border/70 py-2.5 last:border-b-0";

const ADMIN_FORM_SELECT_TRIGGER_CLASS =
  "min-w-0 w-full max-w-full overflow-hidden [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate";

const ADMIN_FORM_LIST_PANEL_CLASS =
  "overflow-hidden rounded-md border border-border bg-[var(--surface)] shadow-none";

const ADMIN_FORM_EMPTY_CLASS =
  "rounded-md border border-dashed border-border bg-[var(--surface-subtle)] px-3 py-4 text-center text-sm text-muted-foreground";

export {
  ADMIN_FORM_DIALOG_CLASS,
  ADMIN_FORM_BODY_CLASS,
  ADMIN_FORM_CONTEXT_CARD_CLASS,
  ADMIN_FORM_DIALOG_CHROME_CLASS,
  ADMIN_FORM_DIALOG_WIDE_CLASS,
  ADMIN_FORM_EMPTY_CLASS,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_FOOTER_CLASS,
  ADMIN_FORM_GRID_2_CLASS,
  ADMIN_FORM_GRID_3_CLASS,
  ADMIN_FORM_GRID_4_CLASS,
  ADMIN_FORM_HEADER_CLASS,
  ADMIN_FORM_HEADER_INSET_CLASS,
  ADMIN_FORM_HELP_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_FORM_LIST_PANEL_CLASS,
  ADMIN_FORM_SCROLL_CLASS,
  ADMIN_FORM_SECTION_CLASS,
  ADMIN_FORM_SECTION_COMPACT_CLASS,
  ADMIN_FORM_SELECT_TRIGGER_CLASS,
  ADMIN_FORM_TOGGLE_CLASS,
};
