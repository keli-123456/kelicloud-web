import CodeMirror from "@uiw/react-codemirror"
import { StreamLanguage } from "@codemirror/language"
import { shell } from "@codemirror/legacy-modes/mode/shell"
import { oneDark } from "@codemirror/theme-one-dark"
import { EditorView } from "@codemirror/view"
import * as React from "react"

import { ThemeContext } from "@/contexts/ThemeContext"
import { useSystemTheme } from "@/hooks/useSystemTheme"
import { cn } from "@/lib/utils"

type CodeEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
  maxHeight?: string
  ariaLabel?: string
}

const shellExtensions = [StreamLanguage.define(shell)]
const codeFontFamily =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace"
const codeLineHeight = "1.65"
const codeFontSize = "0.875rem"
const codeVerticalPadding = "0.75rem"
const gutterHorizontalPadding = "0.5rem"

const lightEditorTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "transparent",
      color: "var(--foreground)",
      fontSize: codeFontSize,
    },
    ".cm-content, .cm-gutters": {
      fontFamily: codeFontFamily,
      lineHeight: codeLineHeight,
    },
    ".cm-content": {
      minHeight: "280px",
      padding: "0",
      whiteSpace: "pre",
    },
    ".cm-gutters": {
      minWidth: "3.25rem",
      border: "none",
      backgroundColor: "var(--muted)",
      color: "var(--muted-foreground)",
      padding: `0 ${gutterHorizontalPadding}`,
    },
    ".cm-line, .cm-gutterElement": {
      lineHeight: codeLineHeight,
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: `0 ${gutterHorizontalPadding} 0 0`,
    },
    ".cm-scroller": {
      overflow: "auto",
      lineHeight: codeLineHeight,
      paddingBlock: codeVerticalPadding,
    },
    ".cm-line": {
      paddingRight: "1rem",
    },
    ".cm-activeLine": {
      backgroundColor: "color-mix(in srgb, var(--accent) 55%, transparent)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--foreground)",
    },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
      backgroundColor: "color-mix(in srgb, var(--accent) 72%, transparent)",
    },
    ".cm-placeholder": {
      color: "var(--muted-foreground)",
    },
    ".cm-focused": {
      outline: "none",
    },
  },
  { dark: false }
)

const darkEditorTheme = [
  oneDark,
  EditorView.theme(
    {
      "&": {
        backgroundColor: "transparent",
        fontSize: codeFontSize,
      },
      ".cm-content, .cm-gutters": {
        fontFamily: codeFontFamily,
        lineHeight: codeLineHeight,
      },
      ".cm-content": {
        minHeight: "280px",
        padding: "0",
        whiteSpace: "pre",
      },
      ".cm-gutters": {
        minWidth: "3.25rem",
        border: "none",
        backgroundColor: "color-mix(in srgb, var(--muted) 86%, transparent)",
        color: "var(--muted-foreground)",
        padding: `0 ${gutterHorizontalPadding}`,
      },
      ".cm-line, .cm-gutterElement": {
        lineHeight: codeLineHeight,
      },
      ".cm-lineNumbers .cm-gutterElement": {
        padding: `0 ${gutterHorizontalPadding} 0 0`,
      },
      ".cm-scroller": {
        overflow: "auto",
        lineHeight: codeLineHeight,
        paddingBlock: codeVerticalPadding,
      },
      ".cm-line": {
        paddingRight: "1rem",
      },
      ".cm-activeLine": {
        backgroundColor: "color-mix(in srgb, var(--accent) 32%, transparent)",
      },
      ".cm-activeLineGutter": {
        backgroundColor: "transparent",
      },
      ".cm-placeholder": {
        color: "var(--muted-foreground)",
      },
      ".cm-focused": {
        outline: "none",
      },
    },
    { dark: true }
  ),
]

function CodeEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = "280px",
  maxHeight = "50vh",
  ariaLabel,
}: CodeEditorProps) {
  const { appearance } = React.useContext(ThemeContext)
  const resolvedAppearance = useSystemTheme(appearance)

  return (
    <div
      data-slot="code-editor"
      className={cn(
        "border-input bg-background focus-within:border-ring focus-within:ring-ring/50 overflow-hidden rounded-md border shadow-xs transition-[color,box-shadow] focus-within:ring-[3px]",
        className
      )}
    >
      <CodeMirror
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        height="auto"
        minHeight={minHeight}
        maxHeight={maxHeight}
        theme={
          resolvedAppearance === "dark" ? darkEditorTheme : lightEditorTheme
        }
        extensions={shellExtensions}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: false,
          autocompletion: false,
          searchKeymap: true,
          completionKeymap: false,
        }}
        indentWithTab
        aria-label={ariaLabel}
      />
    </div>
  )
}

export { CodeEditor }
