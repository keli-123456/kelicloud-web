import { Eula } from "@/utils/field";

export default function LegalSection() {
  return (
    <div className="license-text border-l-2 border-slate-200 pl-4 dark:border-slate-800">
      <pre className="text-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
        {Eula}
      </pre>
    </div>
  );
}
