import { Outlet } from "react-router-dom";

export default function SettingLayout() {
  return (
    <section className="flex flex-col gap-2 px-1 py-1">
      <Outlet />
    </section>
  );
}
