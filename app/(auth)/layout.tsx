export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex items-center justify-center px-6 bg-[var(--color-bg)]">
      <div className="w-full max-w-[320px]">{children}</div>
    </div>
  );
}
