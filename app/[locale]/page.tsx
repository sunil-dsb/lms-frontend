import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { fetchMe, ApiException } from "@/lib/api";

// Root locale page: if signed in, send to /employee/home or /admin/library; otherwise to /login.
export default async function LocaleRootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<never> {
  const { locale } = await params;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
    .join("; ");

  try {
    const me = await fetchMe(cookieHeader);
    if (me.employee.role === "admin" || me.employee.role === "super_admin") {
      redirect(`/${locale}/admin`);
    } else {
      // An employee's interface is in their own language (PROJECT_OVERVIEW §02:
      // "the interface, training, quizzes and AI answers all follow it").
      redirect(`/${me.employee.languagePref || locale}/employee/home`);
    }
  } catch (err) {
    if (err instanceof ApiException) {
      redirect(`/${locale}/login`);
    }
    // Network or unexpected error: fall back to login (safe default).
    redirect(`/${locale}/login`);
  }
}
