import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { LinkIcon } from "lucide-react";
import toast from "../utils/toast";
import api from "../api/axios";
import getErrorMessage from "../utils/getErrorMessage";
import usePageTitle from "../hooks/usePageTitle";
import AuthCard from "../components/ui/AuthCard";
import Button from "../components/ui/Button";
import { Field, PasswordInput } from "../components/ui/Form";

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

const backToLogin = (
  <Button as={Link} to="/login" variant="link">
    Back to log in
  </Button>
);

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
      <div role="alert">
        <AuthCard icon={LinkIcon} title={linkError.title} description={linkError.text} footer={backToLogin}>
          <Button as={Link} to="/forgot-password" variant="primary" size="lg" className="w-full">
            Request a new link
          </Button>
        </AuthCard>
      </div>
    );
  }

  return (
    <AuthCard title="Choose a new password" description="After saving, log in with your new password." error={serverError} footer={backToLogin}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Field label="New password" help="At least 6 characters." error={errors.password?.message}>
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

        <Field label="Confirm new password" error={errors.confirmPassword?.message}>
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
          {isSubmitting ? "Saving..." : "Save new password"}
        </Button>
      </form>
    </AuthCard>
  );
}
