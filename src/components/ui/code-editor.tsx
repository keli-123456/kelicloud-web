import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";

import type { CodeEditorProps } from "./code-editor-core";

const CodeEditorCore = React.lazy(async () => {
  const module = await import("./code-editor-core");
  return { default: module.CodeEditor };
});

function CodeEditor(props: CodeEditorProps) {
  return (
    <React.Suspense
      fallback={
        <Skeleton
          className="w-full rounded-md"
          style={{
            height: props.height || undefined,
            minHeight: props.minHeight || "280px",
            maxHeight: props.maxHeight || "50vh",
          }}
        />
      }
    >
      <CodeEditorCore {...props} />
    </React.Suspense>
  );
}

export { CodeEditor };
export type { CodeEditorProps };
