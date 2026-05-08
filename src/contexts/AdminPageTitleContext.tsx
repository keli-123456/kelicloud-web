import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AdminPageTitleContextValue = {
  title: ReactNode | null;
  description: ReactNode | null;
  setHeader: (header: AdminPageHeaderState) => void;
};

type AdminPageHeaderState = {
  title: ReactNode | null;
  description: ReactNode | null;
};

const AdminPageTitleContext = createContext<AdminPageTitleContextValue | null>(
  null,
);

export function AdminPageTitleProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<AdminPageHeaderState>({
    title: null,
    description: null,
  });
  const value = useMemo(
    () => ({
      title: header.title,
      description: header.description,
      setHeader,
    }),
    [header.description, header.title],
  );

  return (
    <AdminPageTitleContext.Provider value={value}>
      {children}
    </AdminPageTitleContext.Provider>
  );
}

export function useAdminPageTitle(
  title: ReactNode | null | undefined,
  description?: ReactNode | null,
  enabled = true,
) {
  const setHeader = useContext(AdminPageTitleContext)?.setHeader;

  useEffect(() => {
    if (!setHeader || !enabled) return;

    setHeader({
      title: title ?? null,
      description: description ?? null,
    });
    return () => {
      setHeader({
        title: null,
        description: null,
      });
    };
  }, [description, enabled, setHeader, title]);
}

export function useCurrentAdminPageTitle() {
  return useContext(AdminPageTitleContext)?.title ?? null;
}

export function useCurrentAdminPageHeader() {
  const context = useContext(AdminPageTitleContext);
  return {
    title: context?.title ?? null,
    description: context?.description ?? null,
  };
}
