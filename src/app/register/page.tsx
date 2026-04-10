import { RegisterForm } from "@/app/register/register-form";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
      <RegisterForm />
    </main>
  );
}
