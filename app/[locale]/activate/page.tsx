import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ActivateLandingPage({
  params,
}: PageProps): Promise<never> {
  const { locale } = await params;
  redirect(`/${locale}/set-password`);
}
