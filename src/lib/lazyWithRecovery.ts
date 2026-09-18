import { createElement, lazy, type ComponentType } from "react";
import { ChunkLoadError } from "@/components/ChunkLoadError";
import { isDynamicImportFailure } from "./chunkLoadRecovery";

// Keep the owning form mounted if just one lazy editor or route cannot load.
export function lazyWithRecovery<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      return await load();
    } catch (error) {
      if (!isDynamicImportFailure(error)) throw error;
      return { default: (() => createElement(ChunkLoadError, { error })) as unknown as T };
    }
  });
}
