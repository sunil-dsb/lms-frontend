import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string; token: string }>;
}

export default async function ActivateTokenPage({
  params,
}: PageProps): Promise<never> {
  const { locale, token } = await params;
  redirect(`/${locale}/set-password/${token}`);
}
