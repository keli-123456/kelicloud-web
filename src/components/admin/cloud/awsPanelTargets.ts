import type { CloudInstanceShareTarget } from "@/components/admin/cloud/CloudInstanceShareDialog";
import type { CloudInstanceScriptTarget } from "@/components/admin/cloud/CloudInstanceScriptDialog";
import type {
  AWSInstance,
  AWSLightsailInstance,
} from "@/lib/cloudAws";
import { getEC2PrimaryAddress } from "./awsPanelSummaries";
import { getDefaultAutoConnectGroup } from "./awsPanelUtils";

type AWSShareTargetOptions<TInstance> = {
  instance: TInstance;
  providerLabel: string;
  credentialName: string;
  region: string;
  passwordStorageEnabled: boolean;
};

export function buildAWSEC2ScriptTarget(
  instance: AWSInstance,
  providerLabel: string,
  credentialName: string,
): CloudInstanceScriptTarget {
  return {
    providerLabel,
    instanceName: instance.name || instance.instance_id,
    instanceIdentifier: instance.instance_id,
    addresses: [
      instance.public_ip,
      ...instance.ipv6_addresses,
      instance.private_ip,
    ].filter(Boolean),
    groupHint: getDefaultAutoConnectGroup("aws", credentialName),
  };
}

export function buildAWSLightsailScriptTarget(
  instance: AWSLightsailInstance,
  providerLabel: string,
  credentialName: string,
): CloudInstanceScriptTarget {
  return {
    providerLabel,
    instanceName: instance.name,
    instanceIdentifier: instance.name,
    addresses: [
      instance.public_ip,
      instance.private_ip,
      ...instance.ipv6_addresses,
    ].filter(Boolean),
    groupHint: getDefaultAutoConnectGroup("aws", credentialName),
  };
}

export function buildAWSEC2ShareTarget({
  instance,
  providerLabel,
  credentialName,
  region,
  passwordStorageEnabled,
}: AWSShareTargetOptions<AWSInstance>): CloudInstanceShareTarget {
  return {
    provider: "aws",
    resourceType: "ec2",
    resourceId: instance.instance_id,
    resourceName: instance.name || instance.instance_id,
    providerLabel,
    credentialName,
    region,
    primaryAddress: getEC2PrimaryAddress(instance),
    canSharePassword: Boolean(instance.saved_root_password && passwordStorageEnabled),
    canShareManagedSSHKey: false,
  };
}

export function buildAWSLightsailShareTarget({
  instance,
  providerLabel,
  credentialName,
  region,
  passwordStorageEnabled,
}: AWSShareTargetOptions<AWSLightsailInstance>): CloudInstanceShareTarget {
  return {
    provider: "aws",
    resourceType: "lightsail",
    resourceId: instance.name,
    resourceName: instance.name,
    providerLabel,
    credentialName,
    region,
    primaryAddress: instance.public_ip || instance.private_ip || "",
    canSharePassword: Boolean(instance.saved_root_password && passwordStorageEnabled),
    canShareManagedSSHKey: false,
  };
}
