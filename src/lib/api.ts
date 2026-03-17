import React from "react";
import { toast } from "sonner";

/**
 * API utility functions for settings management
 */

export type SettingsScope = "user" | "system";

export interface SettingsResponse {
  sitename: string;
  description: string;
  allow_cors: boolean;
  base_scripts_url: string;
  cn_connectivity_enabled: boolean;
  cn_connectivity_target: string;
  cn_connectivity_interval: number;
  geo_ip_enabled: boolean;
  geo_ip_provider: string;
  o_auth_provider: string;
  o_auth_enabled: boolean;
  custom_head: string;
  CreatedAt: string;
  UpdatedAt: string;
  [key: string]: any;
}

const DEFAULT_SETTINGS: SettingsResponse = {
  sitename: "",
  description: "",
  allow_cors: false,
  base_scripts_url: "",
  cn_connectivity_enabled: false,
  cn_connectivity_target: "",
  cn_connectivity_interval: 60,
  geo_ip_enabled: false,
  geo_ip_provider: "",
  o_auth_provider: "",
  o_auth_enabled: false,
  custom_head: "",
  CreatedAt: "",
  UpdatedAt: "",
};

const getSettingsPath = (scope: SettingsScope) =>
  scope === "system" ? "/api/admin/settings/system" : "/api/admin/settings";

const getResponseMessage = async (response: Response) => {
  try {
    const data = await response.json();
    return data?.message || `HTTP error! status: ${response.status}`;
  } catch {
    return `HTTP error! status: ${response.status}`;
  }
};

/**
 * Fetch settings from the API
 * @returns Promise containing the settings data
 */
export async function getSettings(
  scope: SettingsScope = "user"
): Promise<SettingsResponse> {
  try {
    const response = await fetch(getSettingsPath(scope));

    if (!response.ok) {
      throw new Error(await getResponseMessage(response));
    }

    const data = await response.json();

    // Remove database metadata fields that are not needed for UI
    const settings = { ...(data["data"] ?? {}) };
    delete settings.CreatedAt;
    delete settings.UpdatedAt;
    delete settings.id;

    return settings as SettingsResponse;
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    throw error;
  }
}

/**
 * Update settings via the API
 * @param settings - The settings object to update
 * @returns Promise containing the response
 */
export async function updateSettings(
  settings: Partial<SettingsResponse>,
  scope: SettingsScope = "user"
): Promise<void> {
  try {
    const response = await fetch(getSettingsPath(scope), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.log("Error response data:", errorData.message);
      throw new Error(`${errorData["message"]}`);
    }
  } catch (error) {
    console.error("Failed to update settings:", error);
    throw error;
  }
}
export async function updateSettingsWithToast(
  settings: Partial<SettingsResponse>,
  t: (key: string) => string,
  scope: SettingsScope = "user"
): Promise<void> {
  try {
    await updateSettings(settings, scope);
    toast.success(t("settings.settings_saved"));
  } catch (error) {
    toast.error(t("settings.settings_save_failed") + ": " + error);
    throw error;
  }
}

/**
 * Update a single setting field
 * @param key - The setting key to update
 * @param value - The new value for the setting
 * @param currentSettings - The current settings object (to merge with)
 * @returns Promise containing the response
 */
export async function updateSingleSetting<K extends keyof SettingsResponse>(
  key: K,
  value: SettingsResponse[K],
  _currentSettings: SettingsResponse,
  scope: SettingsScope = "user"
): Promise<void> {
  return updateSettings({ [key]: value }, scope);
}

/**
 * Hook for managing settings state and API calls
 */
export function useSettings(
  scope: SettingsScope = "user",
  options?: { enabled?: boolean }
) {
  const enabled = options?.enabled ?? true;
  const [settings, setSettings] = React.useState<SettingsResponse>(DEFAULT_SETTINGS);
  const [loading, setLoading] = React.useState(enabled);
  const [error, setError] = React.useState<string | null>(null);

  const refetch = React.useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return DEFAULT_SETTINGS;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getSettings(scope);
      setSettings(data);
      return data;
    } catch (err) {
      const nextError =
        err instanceof Error ? err.message : "Failed to fetch settings";
      setError(nextError);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [enabled, scope]);

  React.useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }

    refetch().catch(() => undefined);
  }, [enabled, refetch]);

  const updateSetting = async <K extends keyof SettingsResponse>(
    key: K,
    value: SettingsResponse[K]
  ) => {
    try {
      await updateSingleSetting(key, value, settings, scope);
      setSettings((prev) => ({ ...prev, [key]: value }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to update ${String(key)}`
      );
      throw err;
    }
  };

  // Update multiple settings
  const updateMultipleSettings = async (
    newSettings: Partial<SettingsResponse>
  ) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      await updateSettings(newSettings, scope);
      setSettings(updatedSettings);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update settings"
      );
      throw err;
    }
  };

  return {
    settings,
    loading,
    error,
    updateSetting,
    updateMultipleSettings,
    refetch,
  };
}
