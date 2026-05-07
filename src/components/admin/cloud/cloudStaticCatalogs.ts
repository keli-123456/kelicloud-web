import type { DigitalOceanCatalog } from "@/lib/cloud";
import type { LinodeCatalog } from "@/lib/cloudLinode";
import type { VultrCatalog } from "@/lib/cloudVultr";
import type { AzureCatalog } from "@/lib/cloudAzure";
import {
  COMMON_AZURE_LOCATIONS,
  COMMON_AZURE_SIZES,
  COMMON_DIGITALOCEAN_IMAGES,
  COMMON_DIGITALOCEAN_REGIONS,
  COMMON_DIGITALOCEAN_SIZES,
  COMMON_LINODE_IMAGES,
  COMMON_LINODE_REGIONS,
  COMMON_LINODE_TYPES,
  COMMON_VULTR_IMAGES,
  COMMON_VULTR_PLANS,
  COMMON_VULTR_REGIONS,
  DEFAULT_AZURE_LOCATION,
  DEFAULT_DIGITALOCEAN_REGION,
  DEFAULT_LINODE_REGION,
  DEFAULT_VULTR_REGION,
} from "@/lib/failoverV2Presets";

type PresetOption = {
  value: string;
  label: string;
  hint?: string;
};

function preferredFirst<T extends PresetOption>(items: T[], preferredValue: string) {
  const preferred = items.find((item) => item.value === preferredValue);
  if (!preferred) return items;
  return [preferred, ...items.filter((item) => item.value !== preferredValue)];
}

function parseVcpus(hint = "") {
  const match = hint.match(/(\d+(?:\.\d+)?)\s*vCPU/i);
  return match ? Number(match[1]) : 1;
}

function parseMemoryGb(hint = "") {
  const match = hint.match(/(\d+(?:\.\d+)?)\s*GB/i);
  return match ? Number(match[1]) : 1;
}

function parseDiskGb(hint = "") {
  const matches = [...hint.matchAll(/(\d+(?:\.\d+)?)\s*GB/g)];
  return matches[1] ? Number(matches[1][1]) : 25;
}

function parseCountry(hint = "") {
  return hint.toLowerCase().replace(/[^a-z]/g, "").slice(0, 2);
}

export function buildStaticDigitalOceanCatalog(): DigitalOceanCatalog {
  const regions = preferredFirst(COMMON_DIGITALOCEAN_REGIONS, DEFAULT_DIGITALOCEAN_REGION)
    .map((region) => ({
      name: region.label,
      slug: region.value,
      available: true,
      features: [],
      sizes: COMMON_DIGITALOCEAN_SIZES.map((size) => size.value),
    }));

  const regionSlugs = regions.map((region) => region.slug);
  return {
    regions,
    sizes: COMMON_DIGITALOCEAN_SIZES.map((size) => {
      const memoryGb = parseMemoryGb(size.hint);
      const vcpus = parseVcpus(size.hint);
      return {
        slug: size.value,
        memory: Math.round(memoryGb * 1024),
        vcpus,
        disk: 25 * Math.max(vcpus, 1),
        transfer: 1,
        price_monthly: 0,
        price_hourly: 0,
        available: true,
        regions: regionSlugs,
        description: size.label,
      };
    }),
    images: COMMON_DIGITALOCEAN_IMAGES.map((image, index) => {
      const [distribution = image.label, ...nameParts] = image.label.split(" ");
      return {
        id: index + 1,
        name: nameParts.join(" ") || image.label,
        type: "snapshot",
        distribution,
        slug: image.value,
        public: true,
        regions: regionSlugs,
        min_disk_size: 25,
        description: image.label,
      };
    }),
    ssh_keys: [],
  };
}

export function buildStaticLinodeCatalog(): LinodeCatalog {
  return {
    regions: preferredFirst(COMMON_LINODE_REGIONS, DEFAULT_LINODE_REGION).map((region) => ({
      id: region.value,
      label: region.label,
      country: parseCountry(region.hint),
      capabilities: [],
    })),
    types: COMMON_LINODE_TYPES.map((type) => {
      const memoryGb = parseMemoryGb(type.hint);
      const vcpus = parseVcpus(type.hint);
      return {
        id: type.value,
        label: type.label,
        memory: Math.round(memoryGb * 1024),
        disk: 25 * Math.max(vcpus, 1),
        vcpus,
        transfer: 1,
        price: { hourly: 0, monthly: 0 },
        addons: { backups: { hourly: 0, monthly: 0 } },
        network_out: 0,
        class: "standard",
      };
    }),
    images: COMMON_LINODE_IMAGES.map((image) => ({
      id: image.value,
      label: image.label,
      description: image.label,
      vendor: image.label.split(" ")[0] || "",
      deprecated: false,
      is_public: true,
      created: "",
    })),
    ssh_keys: [],
  };
}

export function buildStaticVultrCatalog(): VultrCatalog {
  return {
    regions: preferredFirst(COMMON_VULTR_REGIONS, DEFAULT_VULTR_REGION).map((region) => ({
      id: region.value,
      city: region.label,
      country: region.hint || "",
      continent: "",
      options: [],
    })),
    plans: COMMON_VULTR_PLANS.map((plan) => {
      const memoryGb = parseMemoryGb(plan.hint);
      const vcpus = parseVcpus(plan.hint);
      return {
        id: plan.value,
        vcpu_count: vcpus,
        ram: Math.round(memoryGb * 1024),
        disk: parseDiskGb(plan.hint),
        disk_count: 1,
        bandwidth: 1,
        monthly_cost: 0,
        type: "vc2",
        locations: [],
      };
    }),
    os: COMMON_VULTR_IMAGES.map((image) => ({
      id: Number(image.value),
      name: image.label,
      arch: image.label.toLowerCase().includes("x64") ? "x64" : "",
      family: image.label.split(" ")[0] || "",
    })),
    ssh_keys: [],
  };
}

export function buildStaticAzureCatalog(activeLocation = DEFAULT_AZURE_LOCATION): AzureCatalog {
  return {
    active_location: activeLocation,
    locations: preferredFirst(COMMON_AZURE_LOCATIONS, activeLocation).map((location) => ({
      name: location.value,
      displayName: location.label,
      regionalDisplayName: location.label,
    })),
    sizes: COMMON_AZURE_SIZES.map((size) => ({
      name: size.value,
      vcpus: parseVcpus(size.hint),
      memory_gb: parseMemoryGb(size.hint),
      zones: [],
      max_data_disk_count: 4,
    })),
  };
}
