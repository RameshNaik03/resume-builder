import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "../utils/toast";
import { useAuth } from "../context/AuthContext";
import getErrorMessage from "../utils/getErrorMessage";
import usePageTitle from "../hooks/usePageTitle";
import AuthCard from "../components/ui/AuthCard";
import Button from "../components/ui/Button";
import { Field, Input, PasswordInput } from "../components/ui/Form";

export default function Register() {
  usePageTitle("Sign up");
  // Renamed so it doesn't clash with react-hook-form's register()
  const { register: registerUser } = useAuth();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async ({ name, email, password }) => {
    setServerError("");
    try {
      await registerUser(name, email, password);
      toast.success("Account created! Welcome aboard.");
      // PublicRoute redirects to the dashboard once the user is set
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <AuthCard
      title="Create your account"
      description="Start building your resume in a few minutes."
      error={serverError}
      footer={
        <>
          Already have an account?{" "}
          <Button as={Link} to="/login" variant="link">
            Log in
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Field label="Full name" error={errors.name?.message}>
          {(props) => (
            <Input
              {...props}
              type="text"
              autoComplete="name"
              placeholder="Priya Raman"
              controlSize="lg"
              {...register("name", {
                required: "Name is required",
                validate: (value) => value.trim().length > 0 || "Name is required",
                maxLength: { value: 50, message: "Name must be 50 characters or less" },
              })}
            />
          )}
        </Field>

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

        <Field label="Password" help="At least 6 characters." error={errors.password?.message}>
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="new-password"
              controlSize="lg"
              {...register("password", {
                required: "Password is required",
                minLength: { value: 6, message: "Password must be at least 6 characters" },
              })}
            />
          )}
        </Field>

        <Field label="Confirm password" error={errors.confirmPassword?.message}>
          {(props) => (
            <PasswordInput
              {...props}
              autoComplete="new-password"
              controlSize="lg"
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (value) => value === getValues("password") || "Passwords do not match",
              })}
            />
          )}
        </Field>

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
