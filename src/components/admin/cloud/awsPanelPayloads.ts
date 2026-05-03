import type {
  CreateAWSInstanceInput,
  CreateAWSLightsailInstanceInput,
} from "@/lib/cloudAws";
import type {
  CreateFormState,
  LightsailCreateFormState,
} from "./awsPanelState";
import { parseTags } from "./awsPanelUtils";

export function buildCreateAWSInstancePayload(
  form: CreateFormState,
  region: string,
  defaultAutoConnectGroup: string,
): CreateAWSInstanceInput {
  return {
    region,
    name: form.name,
    image_id: form.image_id,
    instance_type: form.instance_type,
    key_name: form.key_name,
    subnet_id: "",
    security_group_ids: form.security_group_ids,
    user_data: form.user_data,
    assign_public_ip: form.assign_public_ip,
    assign_ipv6: form.assign_ipv6,
    allow_all_traffic: form.allow_all_traffic,
    root_password_mode: form.root_password_mode,
    root_password: form.root_password,
    tags: parseTags(form.tagsText),
    auto_connect: form.auto_connect,
    auto_connect_group: form.auto_connect ? form.auto_connect_group || defaultAutoConnectGroup : "",
  };
}

export function buildCreateAWSLightsailInstancePayload(
  form: LightsailCreateFormState,
  region: string,
  defaultAutoConnectGroup: string,
): CreateAWSLightsailInstanceInput {
  return {
    region,
    name: form.name,
    availability_zone: form.availability_zone,
    blueprint_id: form.blueprint_id,
    bundle_id: form.bundle_id,
    key_pair_name: form.key_pair_name || "",
    user_data: form.user_data || "",
    ip_address_type: form.ip_address_type || "dualstack",
    allow_all_traffic: form.allow_all_traffic,
    root_password_mode: form.root_password_mode,
    root_password: form.root_password,
    tags: parseTags(form.tagsText),
    auto_connect: form.auto_connect,
    auto_connect_group: form.auto_connect ? form.auto_connect_group || defaultAutoConnectGroup : "",
  };
}
