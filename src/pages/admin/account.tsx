import React from "react";

import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { CircleUserRound, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAccount } from "@/contexts/AccountContext";
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
import { AdminUsersSection } from "./users";

type AccountSection = "account" | "users";

const sectionButtonClass = (active: boolean) =>
  active
    ? "bg-blue-600/90 text-white shadow-sm shadow-blue-900/10 dark:bg-blue-500/80 dark:text-white"
    : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800";

const Account = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get("tab") === "users" ? "users" : "account";
  const { t } = useTranslation();
  const accountSectionRef = React.useRef<HTMLDivElement>(null);
  const usersSectionRef = React.useRef<HTMLDivElement>(null);

  const navigateToSection = (nextSection: AccountSection) => {
    const container = nextSection === "account"
      ? accountSectionRef.current
      : usersSectionRef.current;
    container?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    const next = new URLSearchParams(searchParams);
    if (nextSection === "account") {
      next.delete("tab");
    } else {
      next.set("tab", "users");
    }
    setSearchParams(next, { replace: true });
  };

  React.useEffect(() => {
    const target = activeSection === "users"
      ? usersSectionRef.current
      : accountSectionRef.current;
    target?.scrollIntoView({
      behavior: "auto",
      block: "start",
    });
  }, [activeSection]);

  return (
    <AdminPageShell
      className="mx-auto w-full max-w-7xl"
      title={t("account.title")}
      description={t("account.page_description")}
      subnav={
        <div className="inline-flex w-full min-w-0 flex-wrap gap-1 rounded-lg border border-border bg-slate-50/70 p-1 dark:border-slate-800 dark:bg-slate-900/30">
          <button
            type="button"
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition ${sectionButtonClass(
              activeSection === "account",
            )}`}
            onClick={() => navigateToSection("account")}
          >
            <CircleUserRound className="h-4 w-4" />
            <span>{t("account.title")}</span>
          </button>
          <button
            type="button"
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition ${sectionButtonClass(
              activeSection === "users",
            )}`}
            onClick={() => navigateToSection("users")}
          >
            <Users className="h-4 w-4" />
            <span>{t("admin.users.title")}</span>
          </button>
        </div>
      }
    >
      <div className="grid items-start gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section
          ref={accountSectionRef}
          className="overflow-hidden rounded-lg border border-border bg-card shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="p-4">
            <div className="mb-4 border-b border-slate-200/70 pb-3 dark:border-slate-700/70">
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-50">
                  {t("account.profile_title", "Profile")}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t(
                    "account.profile_description",
                    "Update your username and login password. After a successful password change, you will be redirected to the homepage.",
                  )}
                </p>
              </div>
            </div>
            <AccountProfileSection />
          </div>
        </section>

        <section ref={usersSectionRef} className="min-w-0">
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-950">
            <div className="border-b border-slate-200/70 px-4 py-3 dark:border-slate-700/70">
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-slate-900 dark:text-slate-50">
                  {t("admin.users.title")}
                </h2>
                <p className="mt-1 max-w-2xl text-xs text-slate-500 dark:text-slate-400">
                  {t("admin.users.description")}
                </p>
              </div>
            </div>
            <AdminUsersSection embedded />
          </div>
        </section>
      </div>
    </AdminPageShell>
  );
};

const AccountProfileSection = () => {
  const { t } = useTranslation();
  const { account, loading, error } = useAccount();
  const [usernameSaving, setUsernameSaving] = React.useState(false);
  const [passwordSaving, setPasswordSaving] = React.useState(false);
  if (loading) {
    return <AdminTableSkeleton columns={2} rows={3} />;
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
    <>
      <div className="grid gap-4">
        <AdminSurface className="flex flex-col gap-6">
          <form className="space-y-4" onSubmit={handleSubmitUsernameChange}>
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

          <form onSubmit={changePassword} className="space-y-4">
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
    </>
  );
};

export default Account;
