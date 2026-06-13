import type { Record as LiveRecord } from "@/types/LiveData";

export type NodeLiveSnapshot = {
  online: boolean;
  record: LiveRecord;
};

export type NodeLiveCounts = {
  online: number;
  offline: number;
  unknown: number;
};

export const NODE_TABLE_DEFAULT_PAGE_SIZE = 50;

export const createEmptyLiveRecord = (): LiveRecord => ({
  cpu: { usage: 0 },
  ram: { used: 0 },
  swap: { used: 0 },
  load: { load1: 0, load5: 0, load15: 0 },
  disk: { used: 0 },
  network: { up: 0, down: 0, totalUp: 0, totalDown: 0 },
  connections: { tcp: 0, udp: 0 },
  uptime: 0,
  process: 0,
  message: "",
  cn_connectivity: undefined,
  time: "",
});

export const normalizeLiveSnapshot = (value: any): NodeLiveSnapshot => {
  const fallback = createEmptyLiveRecord();

  if (!value || typeof value !== "object") {
    return { online: false, record: fallback };
  }

  return {
    online: Boolean(value.online),
    record: {
      cpu: { usage: typeof value.cpu === "number" ? value.cpu : 0 },
      ram: { used: value.ram ?? 0 },
      swap: { used: value.swap ?? 0 },
      load: {
        load1: value.load ?? 0,
        load5: value.load5 ?? 0,
        load15: value.load15 ?? 0,
      },
      disk: { used: value.disk ?? 0 },
      network: {
        up: value.net_out ?? 0,
        down: value.net_in ?? 0,
        totalUp: value.net_total_out ?? value.net_total_up ?? 0,
        totalDown: value.net_total_in ?? value.net_total_down ?? 0,
      },
      connections: {
        tcp: value.connections ?? 0,
        udp: value.connections_udp ?? 0,
      },
      gpu:
        value.gpu !== undefined
          ? { count: 0, average_usage: value.gpu, detailed_info: [] }
          : undefined,
      uptime: value.uptime ?? 0,
      process: value.process ?? 0,
      message: "",
      cn_connectivity: value.cn_connectivity ?? undefined,
      time: value.time ?? "",
    },
  };
};

export const isNodeOnline = (live?: NodeLiveSnapshot) => Boolean(live?.online);

export const isNodeOffline = (
  live: NodeLiveSnapshot | undefined,
  liveLoaded: boolean,
) => liveLoaded && Boolean(live) && !isNodeOnline(live);

export const getNodeLiveCounts = (
  uuids: string[],
  liveByNode: Record<string, NodeLiveSnapshot>,
  liveLoaded: boolean,
): NodeLiveCounts => {
  const online = uuids.filter((uuid) => isNodeOnline(liveByNode[uuid])).length;
  const offline = uuids.filter((uuid) =>
    isNodeOffline(liveByNode[uuid], liveLoaded)
  ).length;

  return {
    online,
    offline,
    unknown: Math.max(uuids.length - online - offline, 0),
  };
};
