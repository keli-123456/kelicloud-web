import React from "react";

import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { AccountProvider, useAccount } from "@/contexts/AccountContext";
import {
  Button,
  TextField,
} from "@/components/admin/admin-ui";
import {
  AdminPageShell,
  AdminSurface,
  AdminTableSkeleton,
} from "@/components/admin/AdminPageShell";
import {
  ADMIN_FORM_FIELD_CLASS,
} from "@/components/admin/AdminFormStyles";
import { formatApiErrorMessage, getReadableErrorMessage } from "@/lib/apiErrorMessage";

const Account = () => {
  return (
    <AccountProvider>
      <InnerLayout />
    </AccountProvider>
  );
};

const InnerLayout = () => {
  const { t } = useTranslation();
  const { account, loading, error } = useAccount();
  const [usernameSaving, setUsernameSaving] = React.useState(false);
  const [passwordSaving, setPasswordSaving] = React.useState(false);
  if (loading) {
    return (
      <AdminPageShell
        eyebrow={t("account.title")}
        title={t("account.title")}
        description={t(
          "account.page_description",
          "Manage your username and password.",
        )}
      >
        <div className="grid gap-4">
          <AdminTableSkeleton columns={2} rows={3} />
        </div>
      </AdminPageShell>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  function handleSubmitUsernameChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUsernameSaving(true);
    fetch("/api/admin/update/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uuid: account?.uuid,
        username: (event.currentTarget as HTMLFormElement).username.value,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(formatApiErrorMessage("Failed to update username", { status: response.status }));
        }
        return response.json();
      })
      .then(() => {
        toast.success(t("common.updated_successfully"));
      })
      .catch((error) => {
        toast.error(getReadableErrorMessage(error));
      })
      .finally(() => {
        setUsernameSaving(false);
      });
  }
  function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const password = form.password.value;
    const password_repeat = form.password_repeat.value;
    if (!password || !password_repeat) {
      toast.error(t("account.password_empty_error"));
      return;
    }
    if (password !== password_repeat) {
      toast.error(t("account.password_mismatch_error"));
      return;
    }
    if (password.length < 8) {
      toast.error(t("account.password_too_short_error"));
      return;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      toast.error(t("account.password_strength_error"));
      return;
    }
    setPasswordSaving(true);
    fetch("/api/admin/update/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uuid: account?.uuid,
        password: password,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json();
          throw new Error(formatApiErrorMessage(data.message || "Failed to update password", { status: response.status }));
        }
        return response.json();
      })
      .then(() => {
        toast.success(t("common.updated_successfully"));
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      })
      .catch((error) => {
        toast.error(getReadableErrorMessage(error));
      })
      .finally(() => {
        setPasswordSaving(false);
      });
  }

  return (
    <AdminPageShell
      eyebrow={t("account.title")}
      title={t("account.greeting", { username: account?.username })}
      description={t(
        "account.page_description",
        "Manage your username and password.",
      )}
    >
      <div className="grid gap-4">
        <AdminSurface className="flex flex-col gap-6">
          <div className="space-y-2">
          <label className="text-xl font-semibold tracking-normal text-slate-900 dark:text-slate-50">
              {t("account.profile_title", "Profile")}
            </label>
            <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
              {t(
                "account.profile_description",
                "Update your username and login password. After a successful password change, you will be redirected to the homepage.",
              )}
            </p>
          </div>
          <form className="max-w-xl space-y-4" onSubmit={handleSubmitUsernameChange}>
            <div className={ADMIN_FORM_FIELD_CLASS}>
              <label
                data-slot="label"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
                htmlFor="username"
              >
                {t("account.change_username_title")}
              </label>
              <TextField.Root
                className="w-full"
                id="username"
                name="username"
                defaultValue={account?.username}
              />
            </div>
            <div>
              <Button disabled={usernameSaving} type="submit">
                {t("account.change_username_button")}
              </Button>
            </div>
          </form>

          <div className="h-px bg-[linear-gradient(90deg,rgba(148,163,184,0.10),rgba(148,163,184,0.65),rgba(148,163,184,0.10))]" />

          <form onSubmit={changePassword} className="max-w-xl space-y-4">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("account.change_password_title")}
            </label>
            <div className={ADMIN_FORM_FIELD_CLASS}>
              <label
                data-slot="label"
                className="text-sm text-slate-600 dark:text-slate-400"
                htmlFor="password"
              >
                {t("account.new_password")}
              </label>
              <TextField.Root
                className="w-full"
                id="password"
                name="password"
                type="password"
              />
            </div>
            <div className={ADMIN_FORM_FIELD_CLASS}>
              <label
                data-slot="label"
                className="text-sm text-slate-600 dark:text-slate-400"
                htmlFor="password_repeat"
              >
                {t("account.new_password_repeat")}
              </label>
              <TextField.Root
                className="w-full"
                id="password_repeat"
                name="password_repeat"
                type="password"
              />
            </div>
            <div>
              <Button disabled={passwordSaving} type="submit">
                {t("account.change_password_button")}
              </Button>
            </div>
          </form>
        </AdminSurface>
      </div>
    </AdminPageShell>
  );
};

export default Account;
