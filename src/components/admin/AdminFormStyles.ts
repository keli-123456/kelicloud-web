const ADMIN_FORM_DIALOG_CLASS =
  "flex max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-5xl flex-col overflow-hidden";

const ADMIN_FORM_DIALOG_WIDE_CLASS =
  "flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-[96rem] flex-col overflow-hidden";

const ADMIN_FORM_SCROLL_CLASS =
  "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1 [scrollbar-gutter:stable]";

const ADMIN_FORM_SECTION_CLASS =
  "border-t border-slate-200/70 pt-5 first:border-t-0 first:pt-0 dark:border-slate-800/70";

const ADMIN_FORM_SECTION_COMPACT_CLASS =
  "border-t border-slate-200/70 pt-4 first:border-t-0 first:pt-0 dark:border-slate-800/70";

const ADMIN_FORM_FIELD_CLASS =
  "grid min-w-0 gap-1.5 [&>[data-slot=label]]:h-5 [&>[data-slot=label]]:min-w-0 [&>[data-slot=label]]:overflow-hidden [&>[data-slot=label]]:text-ellipsis [&>[data-slot=label]]:whitespace-nowrap [&>[data-slot=label]]:leading-5";

const ADMIN_FORM_GRID_2_CLASS = "grid items-start gap-3 md:grid-cols-2";
const ADMIN_FORM_GRID_3_CLASS = "grid items-start gap-3 md:grid-cols-3";
const ADMIN_FORM_GRID_4_CLASS = "grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4";

const ADMIN_FORM_TOGGLE_CLASS =
  "flex min-h-10 items-center justify-between gap-3 border-b border-slate-200/70 py-2 last:border-b-0 dark:border-slate-800/70";

const ADMIN_FORM_SELECT_TRIGGER_CLASS =
  "min-w-0 w-full max-w-full overflow-hidden [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate";

const ADMIN_FORM_LIST_PANEL_CLASS =
  "overflow-hidden rounded-lg border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950/40";

const ADMIN_FORM_EMPTY_CLASS =
  "rounded-lg border border-dashed border-slate-300 bg-muted/20 px-4 py-3 text-sm text-muted-foreground dark:border-slate-700";

export {
  ADMIN_FORM_DIALOG_CLASS,
  ADMIN_FORM_DIALOG_WIDE_CLASS,
  ADMIN_FORM_EMPTY_CLASS,
  ADMIN_FORM_FIELD_CLASS,
  ADMIN_FORM_GRID_2_CLASS,
  ADMIN_FORM_GRID_3_CLASS,
  ADMIN_FORM_GRID_4_CLASS,
  ADMIN_FORM_LIST_PANEL_CLASS,
  ADMIN_FORM_SCROLL_CLASS,
  ADMIN_FORM_SECTION_CLASS,
  ADMIN_FORM_SECTION_COMPACT_CLASS,
  ADMIN_FORM_SELECT_TRIGGER_CLASS,
  ADMIN_FORM_TOGGLE_CLASS,
};
