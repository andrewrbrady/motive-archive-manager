import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata = {
  title: "Reset Password - Motive Archive Manager",
  description: "Reset your password to access your account",
};

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-8">
          Motive Archive Manager
        </h1>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
