// routes.js
import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import React from "react";
import { Navigate } from "react-router-dom";

const Index = lazy(() => import("./pages/Index"));
const AdminLayout = lazy(() => import("./pages/admin/_layout"));
const Admin = lazy(() => import("./pages/admin"));
const NotFound = lazy(() => import("./pages/404"));

export const routes: RouteObject[] = [
  {
    path: "/",
    element: React.createElement(lazy(() => import("./pages/_layout"))),
    children: [
      { index: true, element: React.createElement(Index) },
      {
        path: "instance/:uuid",
        element: React.createElement(lazy(() => import("./pages/instance"))),
      },
      {
        path: "cloud/share/:token",
        element: React.createElement(lazy(() => import("./pages/cloudShare"))),
      },
    ],
  },
  {
    path: "/admin",
    element: React.createElement(AdminLayout),
    children: [
      { index: true, element: React.createElement(Admin) },
      {
        path: "sessions",
        element: React.createElement(
          lazy(() => import("./pages/admin/sessions"))
        ),
      },
      {
        path: "account",
        element: React.createElement(
          lazy(() => import("./pages/admin/account"))
        ),
      },
      {
        path: "users",
        element: React.createElement(
          lazy(() => import("./pages/admin/users"))
        ),
      },
      {
        path: "cloud",
        element: React.createElement(lazy(() => import("./pages/admin/cloud"))),
      },
      {
        path: "dns",
        element: React.createElement(lazy(() => import("./pages/admin/cloud-dns"))),
      },
      {
        path: "failover",
        element: React.createElement(lazy(() => import("./pages/admin/failover"))),
      },
      {
        path: "failover-v2",
        element: React.createElement(lazy(() => import("./pages/admin/failover-v2"))),
      },
      {
        path: "settings",
        element: React.createElement(
          lazy(() => import("./pages/admin/settings/_layout"))
        ),
        children: [
          {
            index: true,
            element: React.createElement(Navigate, {
              to: "general",
              replace: true,
            }),
          },
          {
            path: "site",
            element: React.createElement(
              lazy(() => import("./pages/admin/settings/site"))
            ),
          },
          {
            path: "custom",
            element: React.createElement(
              lazy(() => import("./pages/admin/settings/custom"))
            ),
          },
          {
            path: "sign-on",
            element: React.createElement(
              lazy(() => import("./pages/admin/settings/sign-on"))
            ),
          },
          {
            path: "notification",
            element: React.createElement(
              lazy(() => import("./pages/admin/settings/notification"))
            ),
          },
          {
            path: "general",
            element: React.createElement(
              lazy(() => import("./pages/admin/settings/general"))
            ),
          },
          {
            path: "proxy",
            element: React.createElement(
              lazy(() => import("./pages/admin/settings/proxy"))
            ),
          },
        ],
      },
      {
        path: "notification",
        element: React.createElement(
          lazy(() => import("./pages/admin/notification/_layout"))
        ),
        children: [
          {
            index: true,
            element: React.createElement(Navigate, {
              to: "general",
              replace: true,
            }),
          },
          {
            path: "offline",
            element: React.createElement(
              lazy(() => import("./pages/admin/notification/offline"))
            ),
          },
          {
            path: "load",
            element: React.createElement(
              lazy(() => import("./pages/admin/notification/load"))
            ),
          },
          {
            path: "general",
            element: React.createElement(
              lazy(() => import("./pages/admin/notification/general"))
            ),
          },
        ],
      },
      {
        path: "ping",
        element: React.createElement(
          lazy(() => import("./pages/admin/pingTask"))
        ),
      },
      {
        path: "about",
        element: React.createElement(lazy(() => import("./pages/admin/about"))),
      },
      {
        path: "logs",
        element: React.createElement(lazy(() => import("./pages/admin/log"))),
      },
      {
        path: "exec",
        element: React.createElement(lazy(() => import("./pages/admin/exec"))),
      },
      {
        path: "scripts",
        element: React.createElement(lazy(() => import("./pages/admin/scripts"))),
      },
    ],
  },
  {
    path: "/terminal",
    element: React.createElement(lazy(() => import("./pages/terminal"))),
  },
  {
    path: "/manage/*",
    element: React.createElement(lazy(() => import("./pages/manage"))),
  },
  // Catch-all 404 route
  { path: "*", element: React.createElement(NotFound) },
];
