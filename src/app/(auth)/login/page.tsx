import { LoginForm } from "@/components/auth/AuthForms";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <LoginForm />
    </main>
  );
}
