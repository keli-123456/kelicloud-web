import type {
  AWSCredentialSecret,
  AWSResourcePassword,
  CreateAWSInstanceInput,
  CreateAWSLightsailInstanceInput,
} from "@/lib/cloudAws";

export type CreateFormState = Omit<CreateAWSInstanceInput, "tags"> & {
  tagsText: string;
};

export type LightsailCreateFormState = Omit<CreateAWSLightsailInstanceInput, "tags"> & {
  tagsText: string;
};

export type CredentialSecretState = {
  secret: AWSCredentialSecret;
};

export type CreatedPasswordState = {
  resourceName: string;
  rootPassword: string;
  passwordMode: "custom" | "random";
  resourceKind: "ec2" | "lightsail";
  passwordSaved: boolean;
  passwordSaveError: string;
};

type BuildCreatedPasswordStateInput = {
  resourceName: string;
  submittedPasswordMode: "none" | "custom" | "random";
  customPassword: string;
  generatedPassword?: string;
  resourceKind: "ec2" | "lightsail";
  passwordSaved: boolean;
  passwordSaveError: string;
};

export function buildCreatedPasswordState({
  resourceName,
  submittedPasswordMode,
  customPassword,
  generatedPassword,
  resourceKind,
  passwordSaved,
  passwordSaveError,
}: BuildCreatedPasswordStateInput): CreatedPasswordState | null {
  const rootPassword =
    submittedPasswordMode === "custom"
      ? customPassword
      : generatedPassword || "";

  if (
    (submittedPasswordMode === "custom" || submittedPasswordMode === "random")
    && rootPassword
  ) {
    return {
      resourceName,
      rootPassword,
      passwordMode: submittedPasswordMode,
      resourceKind,
      passwordSaved,
      passwordSaveError,
    };
  }

  return null;
}

export type SavedPasswordState = {
  resourceKind: "ec2" | "lightsail";
  resourceName: string;
  credential: AWSResourcePassword;
};

export type Ec2DetailActionFormState = {
  imageName: string;
  imageDescription: string;
  noReboot: boolean;
  instanceType: string;
  tagsText: string;
  allocationId: string;
  privateIp: string;
};

export type LightsailDetailActionFormState = {
  snapshotName: string;
  staticIpName: string;
};

export const initialCreateForm: CreateFormState = {
  name: "",
  image_id: "",
  instance_type: "",
  key_name: "",
  subnet_id: "",
  security_group_ids: [],
  user_data: "",
  assign_public_ip: true,
  assign_ipv6: true,
  allow_all_traffic: true,
  root_password_mode: "random",
  root_password: "",
  auto_connect: true,
  auto_connect_group: "",
  tagsText: "",
};

export const initialLightsailCreateForm: LightsailCreateFormState = {
  name: "",
  availability_zone: "",
  blueprint_id: "",
  bundle_id: "",
  key_pair_name: "",
  user_data: "",
  ip_address_type: "dualstack",
  allow_all_traffic: true,
  root_password_mode: "random",
  root_password: "",
  auto_connect: true,
  auto_connect_group: "",
  tagsText: "",
};
