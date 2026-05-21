import LoginDialog from "@/components/Login";

const Index = () => {
  return (
    <div className="relative flex min-h-screen min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-slate-50 px-4 py-6 dark:bg-slate-950">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-60 [background-image:radial-gradient(#d7dee8_1px,transparent_1px)] [background-size:28px_28px] dark:opacity-20 dark:[background-image:radial-gradient(rgba(148,163,184,0.42)_1px,transparent_1px)]"
      />
      <div className="relative z-10 flex w-full max-w-[420px] items-center justify-center">
        <LoginDialog
          inline
          variant="simple"
          showSettings={false}
          redirectAuthenticatedTo="/admin"
          className="w-full"
        />
      </div>
    </div>
  );
};

export default Index;
