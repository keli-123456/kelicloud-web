import LoginDialog from "@/components/Login";

const Index = () => {
  return (
    <div className="relative flex min-h-screen min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-background px-4 py-6">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--surface)_72%,transparent),transparent_52%)]"
      />
      <div className="relative z-10 flex w-full max-w-[376px] items-center justify-center">
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
