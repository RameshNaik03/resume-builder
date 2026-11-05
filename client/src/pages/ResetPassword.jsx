import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "../utils/toast";
import { LinkIcon } from "lucide-react";
import api from "../api/axios";
import getErrorMessage from "../utils/getErrorMessage";
import usePageTitle from "../hooks/usePageTitle";
import PasswordInput from "../components/PasswordInput";

// What to show when the link itself is bad (the server sends one of these codes)
const LINK_ERRORS = {
  EXPIRED_TOKEN: {
    title: "This link has expired",
    text: "Password reset links are valid for 15 minutes. Request a new one and use it straight away.",
  },
  INVALID_TOKEN: {
    title: "This link is not valid",
    text: "It may have already been used, or it was copied incompletely. Request a new one to reset your password.",
  },
};

// Opened from the link in the "forgot password" email: /reset-password/:token
export default function ResetPassword() {
  usePageTitle("Reset password");
  const { token } = useParams();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const [linkError, setLinkError] = useState(null); // One of LINK_ERRORS, once the server rejects the link

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async ({ password }) => {
    setServerError("");
    try {
      const { data } = await api.post(`/auth/reset-password/${token}`, { password });
      toast.success(data.message, { duration: 5000 });
      navigate("/login", { replace: true });
    } catch (error) {
      const code = error.response?.data?.code;
      if (LINK_ERRORS[code]) setLinkError(LINK_ERRORS[code]);
      else setServerError(getErrorMessage(error));
    }
  };

  if (linkError) {
    return (
      <div className="flex justify-center px-4 py-16">
        <div className="card w-full max-w-md p-8 text-center" role="alert">
          <LinkIcon className="mx-auto size-10 text-red-500 dark:text-red-400" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{linkError.title}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{linkError.text}</p>
          <Link to="/forgot-password" className="btn-primary mt-6 w-full py-2.5">
            Request a new link
          </Link>
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
              Back to log in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center px-4 py-16">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Choose a new password</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">After saving, log in with your new password.</p>

        {serverError && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300" role="alert">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
          <div>
            <label htmlFor="password" className="label">New password</label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              aria-invalid={errors.password ? "true" : "false"}
              {...register("password", {
                required: "Password is required",
                minLength: { value: 6, message: "Password must be at least 6 characters" },
              })}
            />
            {errors.password && <p className="field-error">{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="label">Confirm new password</label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              placeholder="Repeat your password"
              aria-invalid={errors.confirmPassword ? "true" : "false"}
              {...register("confirmPassword", {
                required: "Please confirm your password",
                validate: (value) => value === getValues("password") || "Passwords do not match",
              })}
            />
            {errors.confirmPassword && <p className="field-error">{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" className="btn-primary w-full py-2.5" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
