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
  setTitle: (title: ReactNode | null) => void;
};

const AdminPageTitleContext = createContext<AdminPageTitleContextValue | null>(
  null,
);

export function AdminPageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState<ReactNode | null>(null);
  const value = useMemo(() => ({ title, setTitle }), [title]);

  return (
    <AdminPageTitleContext.Provider value={value}>
      {children}
    </AdminPageTitleContext.Provider>
  );
}

export function useAdminPageTitle(title: ReactNode | null | undefined) {
  const setTitle = useContext(AdminPageTitleContext)?.setTitle;

  useEffect(() => {
    if (!setTitle) return;

    setTitle(title ?? null);
    return () => {
      setTitle(null);
    };
  }, [setTitle, title]);
}

export function useCurrentAdminPageTitle() {
  return useContext(AdminPageTitleContext)?.title ?? null;
}
