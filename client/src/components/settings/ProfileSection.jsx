import { useEffect, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import toast from "../../utils/toast";
import api from "../../api/axios";
import getErrorMessage from "../../utils/getErrorMessage";
import cropImage from "../../utils/cropImage";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../ui/Avatar";
import Button from "../ui/Button";
import Dialog from "../ui/Dialog";
import { Alert, Card, CardHeader } from "../ui/Display";
import { Field, Input } from "../ui/Form";
import PhotoCropModal from "../editor/PhotoCropModal";
import SettingsSection from "./SettingsSection";

// Settings > Profile: the avatar (uploaded at once, after cropping), the name, and the contact
// details every new resume starts with. Saved with PATCH /api/account/profile.

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_ORIGINAL_MB = 15; // Only the cropped square is uploaded (at most 800 × 800 px)

const CONTACT_FIELDS = [
  { name: "phone", label: "Phone", placeholder: "+49 30 1234567", type: "tel", autoComplete: "tel" },
  { name: "location", label: "Location", placeholder: "Berlin, Germany", type: "text", autoComplete: "address-level2" },
  { name: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/your-name", type: "text" },
  { name: "github", label: "GitHub", placeholder: "github.com/your-name", type: "text" },
  { name: "website", label: "Website", placeholder: "yourname.dev", type: "text", autoComplete: "url" },
];

const valuesOf = (user) => ({ name: user.name ?? "", ...Object.fromEntries(CONTACT_FIELDS.map(({ name }) => [name, user.contactDefaults?.[name] ?? ""])) });

export default function ProfileSection() {
  return (
    <SettingsSection title="Profile" description="How you appear in the app, and the details every new resume starts with.">
      <AvatarCard />
      <DetailsCard />
    </SettingsSection>
  );
}

function AvatarCard() {
  const { user, updateUser } = useAuth();
  const inputRef = useRef(null);
  const [cropSrc, setCropSrc] = useState(null); // The picked image (object URL), while cropping
  const [uploading, setUploading] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");

  // Free the picked image's memory when the crop dialog closes
  useEffect(() => () => cropSrc && URL.revokeObjectURL(cropSrc), [cropSrc]);

  const pickFile = (file) => {
    setError("");
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) return setError("Please choose a JPG, PNG or WebP image. (iPhone HEIC photos: export or share them as JPG first.)");
    if (file.size > MAX_ORIGINAL_MB * 1024 * 1024) return setError(`This image is larger than ${MAX_ORIGINAL_MB} MB. Please choose a smaller one.`);
    setCropSrc(URL.createObjectURL(file));
  };

  const saveCrop = async (area) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", await cropImage(cropSrc, area), "avatar.jpg");
      const { data } = await api.patch("/account/profile", form);
      updateUser(data.user);
      setCropSrc(null);
      toast.success(user.avatarUrl ? "Photo replaced" : "Photo added");
    } catch (uploadError) {
      // Keep the crop dialog open so the user can try again
      toast.error(uploadError.response ? getErrorMessage(uploadError) : uploadError.message);
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    try {
      const { data } = await api.patch("/account/profile", { removeAvatar: true });
      updateUser(data.user);
      setConfirmRemove(false);
      toast.success("Photo removed");
    } catch (removeError) {
      toast.error(getErrorMessage(removeError));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Photo" description="Shown in the top bar's account menu. Square, at most 2 MB once cropped." />
      <div className="flex flex-wrap items-center gap-5">
        <Avatar user={user} size="xl" />
        <div className="flex flex-wrap gap-2">
          <Button icon={Upload} onClick={() => inputRef.current.click()}>
            {user.avatarUrl ? "Replace photo" : "Upload photo"}
          </Button>
          {user.avatarUrl && (
            <Button variant="ghostDanger" icon={Trash2} onClick={() => setConfirmRemove(true)}>
              Remove
            </Button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        aria-label="Choose a photo"
        data-testid="avatar-input"
        onChange={(event) => {
          pickFile(event.target.files[0]);
          event.target.value = ""; // Allow picking the same file again
        }}
      />
      {error && (
        <div className="mt-4">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}

      {cropSrc && (
        <PhotoCropModal
          src={cropSrc}
          onCancel={() => setCropSrc(null)}
          onSave={saveCrop}
          saving={uploading}
          title="Crop your photo"
          description="Drag to place your face in the middle and zoom so it fills the circle."
          saveLabel="Save photo"
        />
      )}
      {confirmRemove && (
        <Dialog
          title="Remove your photo?"
          description="Your initials are shown instead. You can upload a new photo anytime."
          onClose={() => !removing && setConfirmRemove(false)}
          footer={
            <>
              <Button onClick={() => setConfirmRemove(false)} disabled={removing}>
                Cancel
              </Button>
              <Button variant="danger" onClick={remove} loading={removing}>
                Remove photo
              </Button>
            </>
          }
        />
      )}
    </Card>
  );
}

function DetailsCard() {
  const { user, updateUser } = useAuth();
  const [values, setValues] = useState(() => valuesOf(user));
  const [nameError, setNameError] = useState("");
  const [serverError, setServerError] = useState("");
  const [saving, setSaving] = useState(false);
  const changed = JSON.stringify(values) !== JSON.stringify(valuesOf(user));

  const bind = (name) => ({
    value: values[name],
    onChange: (event) => setValues((previous) => ({ ...previous, [name]: event.target.value })),
  });

  const save = async (event) => {
    event.preventDefault();
    setServerError("");
    const name = values.name.trim();
    setNameError(!name ? "Name is required" : name.length > 50 ? "Please keep your name under 50 characters" : "");
    if (!name || name.length > 50) return;
    setSaving(true);
    try {
      const { data } = await api.patch("/account/profile", { ...values, name });
      updateUser(data.user);
      setValues(valuesOf(data.user));
      toast.success("Profile saved");
    } catch (saveError) {
      setServerError(getErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Details" description="Your contact details fill in every new resume. Changing them here doesn't change resumes you already have." />
      <form onSubmit={save} noValidate className="space-y-5">
        <Field label="Name" error={nameError}>
          {(props) => <Input {...props} {...bind("name")} autoComplete="name" maxLength={50} />}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          {CONTACT_FIELDS.map(({ name, label, placeholder, type, autoComplete }) => (
            <Field key={name} label={label} optional>
              {(props) => <Input {...props} {...bind(name)} type={type} placeholder={placeholder} autoComplete={autoComplete ?? "off"} />}
            </Field>
          ))}
        </div>
        {serverError && <Alert tone="danger">{serverError}</Alert>}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" loading={saving} disabled={!changed || saving}>
            Save profile
          </Button>
        </div>
      </form>
    </Card>
  );
}
