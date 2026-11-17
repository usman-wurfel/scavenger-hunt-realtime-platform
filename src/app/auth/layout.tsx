import AuthLayoutShell from "@/components/layout/auth-layout-shell";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthLayoutShell>{children}</AuthLayoutShell>;
}
