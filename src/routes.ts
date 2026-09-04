// routes.js
import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import React from "react";
import { Navigate } from "react-router-dom";


const Index = lazy(() => import("./pages/Index"));
const AdminLayout = lazy(() => import("./pages/admin/_layout"));
const AdminDashboard = lazy(() => import("./pages/admin/dashboard"));
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
      {
        path: "failover/share/:token",
        element: React.createElement(lazy(() => import("./pages/failoverShare"))),
      },
      {
        path: "failover-v1/share/:token",
        element: React.createElement(lazy(() => import("./pages/failoverV1Share"))),
      },
    ],
  },
  {
    path: "/admin",
    element: React.createElement(AdminLayout),
    children: [
      { index: true, element: React.createElement(AdminDashboard) },
      {
        path: "sessions",
        element: React.createElement(Navigate, {
          to: "/admin/audit?tab=sessions",
          replace: true,
        }),
      },
      {
        path: "audit",
        element: React.createElement(
          lazy(() => import("./pages/admin/audit"))
        ),
      },
      {
        path: "client",
        element: React.createElement(
          lazy(() => import("./pages/admin/client"))
        ),
      },
      {
        path: "tunnels",
        element: React.createElement(
          lazy(() => import("./pages/admin/tunnels"))
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
        element: React.createElement(Navigate, {
          to: "/admin/account?tab=users",
          replace: true,
        }),
      },
      {
        path: "billing",
        element: React.createElement(
          lazy(() => import("./pages/admin/billing"))
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
        path: "proxy",
        element: React.createElement(lazy(() => import("./pages/admin/proxy"))),
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
            element: React.createElement(Navigate, {
              to: "/admin/settings/general",
              replace: true,
            }),
          },
          {
            path: "sign-on",
            element: React.createElement(Navigate, {
              to: "/admin/settings/general",
              replace: true,
            }),
          },
          {
            path: "sso",
            element: React.createElement(Navigate, {
              to: "/admin/settings/general",
              replace: true,
            }),
          },
          {
            path: "notification",
            element: React.createElement(Navigate, {
              to: "/admin/notification/general",
              replace: true,
            }),
          },
          {
            path: "general",
            element: React.createElement(
              lazy(() => import("./pages/admin/settings/general"))
            ),
          },
          {
            path: "proxy",
            element: React.createElement(Navigate, {
              to: "/admin/proxy",
              replace: true,
            }),
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
            element: React.createElement(
              lazy(() => import("./pages/admin/notification"))
            ),
          },
          {
            path: "offline",
            element: React.createElement(Navigate, {
              to: "/admin/notification/general",
              replace: true,
            }),
          },
          {
            path: "load",
            element: React.createElement(Navigate, {
              to: "/admin/notification/general",
              replace: true,
            }),
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
        element: React.createElement(Navigate, {
          to: "/admin",
          replace: true,
        }),
      },
      {
        path: "about",
        element: React.createElement(lazy(() => import("./pages/admin/about"))),
      },
      {
        path: "logs",
        element: React.createElement(Navigate, {
          to: "/admin/audit?tab=logs",
          replace: true,
        }),
      },
      {
        path: "exec",
        element: React.createElement(lazy(() => import("./pages/admin/exec"))),
      },
      {
        path: "scripts",
        element: React.createElement(Navigate, {
          to: "/admin/exec",
          replace: true,
        }),
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
