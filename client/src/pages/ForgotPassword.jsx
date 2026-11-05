import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { MailCheck } from "lucide-react";
import api from "../api/axios";
import getErrorMessage from "../utils/getErrorMessage";
import usePageTitle from "../hooks/usePageTitle";
import { pageClass } from "../components/ui/pageLayout";

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

  return (
    <div className={pageClass("narrow")}>
      <div className="card w-full max-w-md p-8">
        {sentTo ? (
          <div className="text-center">
            <MailCheck className="mx-auto size-10 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Check your email</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400" role="status">
              If an account exists for <span className="font-medium text-slate-700 dark:text-slate-200">{sentTo}</span>,
              we've sent a reset link. Check your inbox and spam folder.
            </p>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              The link expires in 15 minutes. Didn't get it?{" "}
              <button
                type="button"
                onClick={() => setSentTo("")}
                className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                try again
              </button>
              .
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Forgot your password?</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Enter your email and we'll send you a link to choose a new one.
            </p>

            {serverError && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300" role="alert">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
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

              <button type="submit" className="btn-primary w-full py-2.5" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send reset link"}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Remembered it?{" "}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
