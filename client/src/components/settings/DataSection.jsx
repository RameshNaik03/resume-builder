import { startTransition, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Trash2 } from "lucide-react";
import toast from "../../utils/toast";
import api from "../../api/axios";
import getErrorMessage from "../../utils/getErrorMessage";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import Dialog from "../ui/Dialog";
import { Alert, Card, CardHeader } from "../ui/Display";
import { Field, Input, PasswordInput } from "../ui/Form";
import SettingsSection from "./SettingsSection";

// Settings > Your data: download everything as a ZIP, and, apart in a danger zone, delete the
// account (confirmed with the password and by typing DELETE). After deleting: logged out, on the
// landing page with a message (see Landing).

// An error from a blob request has its JSON message inside the blob
async function blobErrorMessage(error) {
  if (error.response?.data instanceof Blob) {
    try {
      const { message } = JSON.parse(await error.response.data.text());
      if (message) return message;
    } catch {
      // Not JSON: fall through
    }
  }
  return getErrorMessage(error);
}

export default function DataSection() {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const { data } = await api.get("/account/export", { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `resume-builder-export-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success("Your data is downloading");
    } catch (error) {
      toast.error(await blobErrorMessage(error));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <SettingsSection title="Your data" description="Everything you've made here belongs to you.">
      <Card>
        <CardHeader
          title="Download my data"
          description="A ZIP file with your profile, resumes, jobs, cover letters and ATS results (as JSON), plus the files you uploaded and your photos. You can download it 5 times an hour."
        />
        <Button icon={Download} onClick={download} loading={downloading}>
          {downloading ? "Preparing your file..." : "Download my data"}
        </Button>
      </Card>

      <section aria-labelledby="danger-zone" className="rounded-xl border border-danger/30 bg-surface p-5 sm:p-6" data-testid="danger-zone">
        <h3 id="danger-zone" className="type-h3 text-danger">
          Danger zone
        </h3>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="type-label text-fg">Delete account</p>
            <p className="mt-0.5 type-small text-fg-muted">Permanently delete your account and everything in it. This can't be undone.</p>
          </div>
          <Button variant="danger" icon={Trash2} onClick={() => setDeleting(true)}>
            Delete account
          </Button>
        </div>
      </section>

      {deleting && <DeleteAccountDialog onClose={() => setDeleting(false)} />}
    </SettingsSection>
  );
}

function DeleteAccountDialog({ onClose }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = password.length > 0 && confirmText === "DELETE";

  const remove = async (event) => {
    event.preventDefault();
    if (!ready) return;
    setError("");
    setBusy(true);
    try {
      await api.delete("/account", { data: { currentPassword: password, confirm: confirmText } });
      // The landing page and logged out in one render (see AppShell's log out)
      startTransition(() => {
        navigate("/", { replace: true, state: { notice: "account-deleted" } });
        logout();
      });
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
      setBusy(false);
    }
  };

  return (
    <Dialog
      title="Delete your account?"
      description="This permanently deletes your account, resumes, uploaded files, jobs, cover letters and photos. It can't be undone."
      onClose={() => !busy && onClose()}
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="delete-account-form" variant="danger" loading={busy} disabled={!ready || busy}>
            Delete my account
          </Button>
        </>
      }
    >
      <form id="delete-account-form" onSubmit={remove} noValidate className="space-y-4">
        <p className="type-small text-fg-muted">Want a copy first? Close this and use Download my data.</p>
        <Field label="Current password">
          {(props) => <PasswordInput {...props} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} data-autofocus />}
        </Field>
        <Field label="Type DELETE to confirm">
          {(props) => <Input {...props} autoComplete="off" spellCheck={false} value={confirmText} onChange={(event) => setConfirmText(event.target.value)} />}
        </Field>
        {error && <Alert tone="danger">{error}</Alert>}
      </form>
    </Dialog>
  );
}
