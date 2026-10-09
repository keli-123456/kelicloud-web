import type { FailoverPlanCatalog } from "./failover";

export function digitalOceanPlanOptions(catalog: FailoverPlanCatalog | null, region: string) {
  if (catalog?.provider !== "digitalocean") return { regions: [], sizes: [], images: [] };
  const matchesRegion = Boolean(region) && catalog.region === region;
  return {
    regions: catalog.regions,
    sizes: matchesRegion ? catalog.sizes : [],
    images: matchesRegion ? catalog.images : [],
  };
}

export function digitalOceanPlanIssue(catalog: FailoverPlanCatalog, region: string, size: string, image: string) {
  const options = digitalOceanPlanOptions(catalog, region);
  if (!options.regions.some(option => option.value === region)) return "region";
  if (!options.sizes.some(option => option.value === size)) return "size";
  if (!options.images.some(option => option.value === image)) return "image";
  return null;
}

