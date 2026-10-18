import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import getErrorMessage from "../utils/getErrorMessage";
import usePageTitle from "../hooks/usePageTitle";

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
    <div className="flex justify-center px-4 py-16">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Start building your resume in minutes.</p>

        {serverError && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300" role="alert">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
          <div>
            <label htmlFor="name" className="label">Full name</label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Ramesh Naik"
              className="input"
              aria-invalid={errors.name ? "true" : "false"}
              {...register("name", {
                required: "Name is required",
                validate: (value) => value.trim().length > 0 || "Name is required",
                maxLength: { value: 50, message: "Name must be 50 characters or less" },
              })}
            />
            {errors.name && <p className="field-error">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="input"
              aria-invalid={errors.email ? "true" : "false"}
              {...register("email", {
                required: "Email is required",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Please enter a valid email" },
              })}
            />
            {errors.email && <p className="field-error">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              className="input"
              aria-invalid={errors.password ? "true" : "false"}
              {...register("password", {
                required: "Password is required",
                minLength: { value: 6, message: "Password must be at least 6 characters" },
              })}
            />
            {errors.password && <p className="field-error">{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="label">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              className="input"
              aria-invalid={errors.confirmPassword ? "true" : "false"}
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (value) => value === getValues("password") || "Passwords do not match",
              })}
            />
            {errors.confirmPassword && <p className="field-error">{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" className="btn-primary w-full py-2.5" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
