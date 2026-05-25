const ADMIN_FORM_DIALOG_CLASS =
  "flex max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-5xl flex-col overflow-hidden rounded-lg border-slate-200/80 bg-white shadow-[0_24px_70px_-50px_rgba(15,23,42,0.72)] dark:border-slate-800 dark:bg-slate-950 sm:max-w-5xl";

const ADMIN_FORM_DIALOG_WIDE_CLASS =
  "flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-[96rem] flex-col overflow-hidden rounded-lg border-slate-200/80 bg-white shadow-[0_24px_70px_-50px_rgba(15,23,42,0.72)] dark:border-slate-800 dark:bg-slate-950 sm:max-w-[96rem]";

const ADMIN_FORM_DIALOG_CHROME_CLASS =
  "gap-0 overflow-hidden rounded-lg border-slate-200/80 bg-white p-0 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.72)] dark:border-slate-800 dark:bg-slate-950";

const ADMIN_FORM_HEADER_CLASS =
  "shrink-0 border-b border-slate-200/80 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/45";

const ADMIN_FORM_HEADER_INSET_CLASS =
  "flex min-w-0 flex-col gap-1 pr-10";

const ADMIN_FORM_SCROLL_CLASS =
  "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pr-1 [scrollbar-gutter:stable]";

const ADMIN_FORM_BODY_CLASS =
  "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 py-5 [scrollbar-gutter:stable]";

const ADMIN_FORM_FOOTER_CLASS =
  "flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200/80 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/45 sm:flex-row sm:justify-end";

const ADMIN_FORM_SECTION_CLASS =
  "border-t border-border/70 pt-5 first:border-t-0 first:pt-0";

const ADMIN_FORM_SECTION_COMPACT_CLASS =
  "border-t border-border/70 pt-4 first:border-t-0 first:pt-0";

const ADMIN_FORM_FIELD_CLASS =
  "grid min-w-0 gap-1.5 [&>[data-slot=label]]:h-5 [&>[data-slot=label]]:min-w-0 [&>[data-slot=label]]:overflow-hidden [&>[data-slot=label]]:text-ellipsis [&>[data-slot=label]]:whitespace-nowrap [&>[data-slot=label]]:leading-5";

const ADMIN_FORM_LABEL_CLASS =
  "text-sm font-semibold text-slate-900 dark:text-slate-100";

const ADMIN_FORM_HELP_CLASS =
  "text-xs leading-5 text-slate-500 dark:text-slate-400";

const ADMIN_FORM_CONTEXT_CARD_CLASS =
  "border-l-2 border-slate-200/90 bg-transparent py-2 pl-3 text-sm dark:border-slate-700";

const ADMIN_FORM_GRID_2_CLASS = "grid items-start gap-3 md:grid-cols-2";
const ADMIN_FORM_GRID_3_CLASS = "grid items-start gap-3 md:grid-cols-3";
const ADMIN_FORM_GRID_4_CLASS = "grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4";

const ADMIN_FORM_TOGGLE_CLASS =
  "flex min-h-10 items-center justify-between gap-3 border-b border-border/70 py-2 last:border-b-0";

const ADMIN_FORM_SELECT_TRIGGER_CLASS =
  "min-w-0 w-full max-w-full overflow-hidden [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:truncate";

const ADMIN_FORM_LIST_PANEL_CLASS =
  "overflow-hidden border-y border-slate-200/80 bg-transparent shadow-none dark:border-slate-800";

const ADMIN_FORM_EMPTY_CLASS =
  "border-y border-dashed border-slate-200/80 bg-transparent px-1 py-3 text-sm text-muted-foreground dark:border-slate-800";

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
