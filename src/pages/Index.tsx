import LoginDialog from "@/components/Login";

const Index = () => {
  return (
    <div className="relative flex min-h-screen min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#f8fafc] px-4 py-8 dark:bg-slate-950">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-80 [background-image:radial-gradient(#d7dee8_1.5px,transparent_1.5px)] [background-size:34px_34px] dark:opacity-25 dark:[background-image:radial-gradient(rgba(148,163,184,0.42)_1.5px,transparent_1.5px)]"
      />
      <div className="relative z-10 flex w-full max-w-[672px] items-center justify-center">
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
