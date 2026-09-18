import { useEffect, useState } from "react";
import { createRequestTracker } from "@/lib/requestTracker";

export function useRequestTracker() {
  const [tracker] = useState(createRequestTracker);
  useEffect(() => () => tracker.invalidate(), [tracker]);
  return tracker;
}
