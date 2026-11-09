import { startTransition, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import toast from "../../utils/toast";
import api from "../../api/axios";
import getErrorMessage from "../../utils/getErrorMessage";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import Dialog from "../ui/Dialog";
import { Card, CardHeader } from "../ui/Display";
import SettingsSection from "./SettingsSection";

// Settings > Sessions: "Log out of all devices" (after a confirmation). Every login token stops
// working, this device's too, so it ends on the login page.
export default function SessionsSection() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const logOutEverywhere = async () => {
    setBusy(true);
    try {
      await api.post("/account/logout-all");
      // The login page and logged out in one render (see AppShell's log out)
      startTransition(() => {
        navigate("/login");
        logout();
      });
      toast.success("You've been logged out on every device.");
    } catch (error) {
      toast.error(getErrorMessage(error));
      setBusy(false);
    }
  };

  return (
    <SettingsSection title="Sessions" description="You stay logged in on each device for up to 7 days.">
      <Card>
        <CardHeader title="Log out of all devices" description="Lost a phone, or logged in on a shared computer? This logs you out everywhere, including here. You can log in again right away." />
        <Button icon={LogOut} onClick={() => setConfirming(true)}>
          Log out of all devices
        </Button>
      </Card>

      {confirming && (
        <Dialog
          title="Log out of all devices?"
          description="Every device logged in to your account, including this one, is logged out. Anything unsaved there is lost."
          onClose={() => !busy && setConfirming(false)}
          footer={
            <>
              <Button onClick={() => setConfirming(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="primary" onClick={logOutEverywhere} loading={busy}>
                Log out everywhere
              </Button>
            </>
          }
        />
      )}
    </SettingsSection>
  );
}
