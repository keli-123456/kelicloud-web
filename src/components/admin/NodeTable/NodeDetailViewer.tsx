import { z } from "zod";

import { schema } from "@/components/admin/NodeTable/schema/node";

export function TableCellViewer({ item }: { item: z.infer<typeof schema> }) {
  return (
    <div className="flex h-8 min-w-0 items-center">
      <span className="min-w-0 truncate text-left text-sm font-semibold text-foreground">
        {item.name}
      </span>
    </div>
  );
}
