import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import toast from "../../utils/toast";
import api from "../../api/axios";
import getErrorMessage from "../../utils/getErrorMessage";
import passwordStrength, { MIN_PASSWORD_LENGTH } from "../../utils/passwordStrength";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import { Alert, Card, CardHeader } from "../ui/Display";
import { Field, PasswordInput } from "../ui/Form";
import SettingsSection from "./SettingsSection";

// Settings > Password: current, new and confirm (each with show/hide), and a strength hint for
// the new one. Changing it logs out every other device; this one gets a new token.

const BAR_TONES = ["bg-danger", "bg-danger", "bg-warning", "bg-success", "bg-success"];

export default function PasswordSection() {
  const { replaceToken } = useAuth();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    control,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });
  const newPassword = useWatch({ control, name: "newPassword" });

  const onSubmit = async ({ currentPassword, newPassword: next }) => {
    setServerError("");
    try {
      const { data } = await api.post("/account/password", { currentPassword, newPassword: next });
      replaceToken(data.token); // The old token stopped working
      reset();
      toast.success("Password changed. Your other devices have been logged out.");
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <SettingsSection title="Password" description="Use a password you don't use anywhere else.">
      <Card>
        <CardHeader title="Change password" description="Changing it logs you out on every other device." />
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <Field label="Current password" error={errors.currentPassword?.message}>
            {(props) => <PasswordInput {...props} autoComplete="current-password" {...register("currentPassword", { required: "Please enter your current password" })} />}
          </Field>
          <Field label="New password" error={errors.newPassword?.message}>
            {(props) => (
              <PasswordInput
                {...props}
                autoComplete="new-password"
                {...register("newPassword", {
                  required: "Please enter a new password",
                  minLength: { value: MIN_PASSWORD_LENGTH, message: `Use at least ${MIN_PASSWORD_LENGTH} characters` },
                  validate: (value) => value !== getValues("currentPassword") || "Your new password must be different from your current one",
                })}
              />
            )}
          </Field>
          {newPassword && <StrengthHint password={newPassword} />}
          <Field label="Confirm new password" error={errors.confirmPassword?.message}>
            {(props) => (
              <PasswordInput
                {...props}
                autoComplete="new-password"
                {...register("confirmPassword", {
                  required: "Please type the new password again",
                  validate: (value) => value === getValues("newPassword") || "Passwords do not match",
                })}
              />
            )}
          </Field>
          {serverError && <Alert tone="danger">{serverError}</Alert>}
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Change password
            </Button>
          </div>
        </form>
      </Card>
    </SettingsSection>
  );
}

// Four bars and a word ("Weak", "Good"...), with a tip. Polite live region: it updates as you type.
function StrengthHint({ password }) {
  const { score, label, tip } = passwordStrength(password);
  return (
    <div data-testid="password-strength" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span key={step} className={`h-1 flex-1 rounded-full ${step <= Math.max(score, 1) ? BAR_TONES[score] : "bg-surface-2"}`} />
        ))}
      </div>
      <p className="mt-1.5 type-small text-fg-muted">
        <span className="font-medium text-fg">Strength: {label}.</span> {tip}
      </p>
    </div>
  );
}
