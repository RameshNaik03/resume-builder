import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { MailCheck } from "lucide-react";
import api from "../api/axios";
import getErrorMessage from "../utils/getErrorMessage";
import usePageTitle from "../hooks/usePageTitle";
import AuthCard from "../components/ui/AuthCard";
import Button from "../components/ui/Button";
import { Field, Input } from "../components/ui/Form";

export default function ForgotPassword() {
  usePageTitle("Forgot password");
  const [serverError, setServerError] = useState("");
  // The email we sent the link to (shows the "check your inbox" screen)
  const [sentTo, setSentTo] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async ({ email }) => {
    setServerError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSentTo(email);
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  const footer = (
    <>
      Remembered it?{" "}
      <Button as={Link} to="/login" variant="link">
        Back to log in
      </Button>
    </>
  );

  if (sentTo) {
    return (
      <AuthCard
        icon={MailCheck}
        title="Check your email"
        description={
          <div role="status">
            <p>
              If an account exists for <span className="font-medium text-fg">{sentTo}</span>, we've sent a link to reset your password. Check your inbox and spam folder.
            </p>
            <p className="mt-3">
              The link expires in 15 minutes. Didn't get it?{" "}
              <Button variant="link" onClick={() => setSentTo("")}>
                Try again
              </Button>
            </p>
          </div>
        }
        footer={footer}
      />
    );
  }

  return (
    <AuthCard title="Forgot your password?" description="Enter your email and we'll send you a link to choose a new one." error={serverError} footer={footer}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Field label="Email" error={errors.email?.message}>
          {(props) => (
            <Input
              {...props}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              controlSize="lg"
              {...register("email", {
                required: "Email is required",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Please enter a valid email" },
              })}
            />
          )}
        </Field>

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
