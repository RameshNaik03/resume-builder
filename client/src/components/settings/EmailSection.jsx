import { useState } from "react";
import { useForm } from "react-hook-form";
import { MailCheck } from "lucide-react";
import api from "../../api/axios";
import getErrorMessage from "../../utils/getErrorMessage";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import { Alert, Card, CardHeader } from "../ui/Display";
import { Field, Input, PasswordInput } from "../ui/Form";
import SettingsSection from "./SettingsSection";

// Settings > Email: the current address and the form to change it. The change needs the current
// password; a link goes to the new address and the email only changes once it's opened (see
// pages/ConfirmEmail.jsx). While a change is waiting: "Check your new inbox".

export default function EmailSection() {
  const { user } = useAuth();
  const [changing, setChanging] = useState(false); // Showing the form again while a change waits
  const waiting = Boolean(user.pendingEmail) && !changing;

  return (
    <SettingsSection title="Email" description="The address you log in with. We also send password and account notices here.">
      <Card>
        <CardHeader title="Current email" />
        <p className="type-body break-all text-fg" data-testid="current-email">
          {user.email}
        </p>
      </Card>

      {waiting ? <CheckInbox pendingEmail={user.pendingEmail} email={user.email} onChangeAgain={() => setChanging(true)} /> : <ChangeEmailForm onSent={() => setChanging(false)} />}
    </SettingsSection>
  );
}

function CheckInbox({ pendingEmail, email, onChangeAgain }) {
  return (
    <Card data-testid="check-inbox">
      <div className="flex gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
          <MailCheck className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0" role="status">
          <h3 className="type-h3 text-fg">Check your new inbox</h3>
          <p className="mt-1 type-body text-fg-muted">
            We sent a confirmation link to <strong className="break-all text-fg">{pendingEmail}</strong>. Open it within 30 minutes to finish. Until then you keep logging in
            with <span className="break-all">{email}</span>.
          </p>
          <p className="mt-2 type-small text-fg-muted">Nothing arrived? Check your spam folder, or send the link again.</p>
          <div className="mt-4">
            <Button onClick={onChangeAgain}>Send again or use a different address</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ChangeEmailForm({ onSent }) {
  const { user, updateUser } = useAuth();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { newEmail: user.pendingEmail ?? "", currentPassword: "" } });

  const onSubmit = async ({ newEmail, currentPassword }) => {
    setServerError("");
    try {
      await api.post("/account/email", { newEmail, currentPassword });
      const { data } = await api.get("/auth/me"); // With the pending address
      updateUser(data.user);
      onSent();
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <Card>
      <CardHeader title="Change email" description="We'll send a link to the new address. Your email changes once you open it." />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Field label="New email" error={errors.newEmail?.message}>
          {(props) => (
            <Input
              {...props}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register("newEmail", {
                required: "Please enter your new email",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Please enter a valid email" },
                validate: (value) => value.trim().toLowerCase() !== user.email || "That's already your email",
              })}
            />
          )}
        </Field>
        <Field label="Current password" help="To make sure it's you." error={errors.currentPassword?.message}>
          {(props) => <PasswordInput {...props} autoComplete="current-password" {...register("currentPassword", { required: "Please enter your current password" })} />}
        </Field>
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Send confirmation link
          </Button>
        </div>
      </form>
    </Card>
  );
}
