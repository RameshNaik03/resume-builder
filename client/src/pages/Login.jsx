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

export default function Login() {
  usePageTitle("Log in");
  const { login } = useAuth();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async ({ email, password }) => {
    setServerError("");
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}!`);
      // No navigate() needed: PublicRoute redirects as soon as the user is set
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      description="Log in to continue with your resumes."
      error={serverError}
      footer={
        <>
          Don't have an account?{" "}
          <Button as={Link} to="/register" variant="link">
            Sign up
          </Button>
        </>
      }
    >
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

        <Field
          label="Password"
          error={errors.password?.message}
          aside={
            <Button as={Link} to="/forgot-password" variant="link" className="type-small">
              Forgot password?
            </Button>
          }
        >
          {(props) => <PasswordInput {...props} autoComplete="current-password" controlSize="lg" {...register("password", { required: "Password is required" })} />}
        </Field>

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Log in"}
        </Button>
      </form>
    </AuthCard>
  );
}
