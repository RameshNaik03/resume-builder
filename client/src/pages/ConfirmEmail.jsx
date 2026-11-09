import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import api from "../api/axios";
import getErrorMessage from "../utils/getErrorMessage";
import usePageTitle from "../hooks/usePageTitle";
import { useAuth } from "../context/AuthContext";
import Page from "../components/ui/Page";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Display";
import Loader from "../components/Loader";

// /confirm-email/:token - opened from the link sent to a new email address. Only for logged-in
// users (ProtectedRoute sends others to log in, then back here): the link only works for the
// account that asked for the change. Shows success, expired or invalid.

// One request per token, even when React's development mode runs the effect twice (a second
// request would find the token already used)
const requests = new Map();
const confirmOnce = (token) => {
  if (!requests.has(token)) requests.set(token, api.post("/account/email/confirm", { token }));
  return requests.get(token);
};

const RESULTS = {
  success: { icon: CheckCircle2, tone: "bg-success-soft text-success", title: "Your email has been changed" },
  expired: { icon: Clock, tone: "bg-warning-soft text-warning", title: "This link has expired" },
  invalid: { icon: XCircle, tone: "bg-danger-soft text-danger", title: "This link doesn't work" },
};

export default function ConfirmEmail() {
  usePageTitle("Confirm your email");
  const { token } = useParams();
  const { updateUser } = useAuth();
  const [result, setResult] = useState(null); // { kind, message, email }

  useEffect(() => {
    let current = true;
    confirmOnce(token)
      .then(({ data }) => {
        if (!current) return;
        updateUser(data.user);
        setResult({ kind: "success", email: data.user.email });
      })
      .catch((error) => {
        if (!current) return;
        const code = error.response?.data?.code;
        setResult({ kind: code === "EXPIRED_TOKEN" ? "expired" : "invalid", message: getErrorMessage(error) });
      });
    return () => {
      current = false;
    };
  }, [token, updateUser]);

  if (!result) return <Loader text="Confirming your new email..." />;
  const { icon: Icon, tone, title } = RESULTS[result.kind];

  return (
    <Page width="narrow">
      <Card className="text-center" data-testid={`confirm-email-${result.kind}`}>
        <span className={`mx-auto grid size-12 place-items-center rounded-full ${tone}`}>
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 type-h2 text-fg">{title}</h1>
        <p className="mt-2 type-body text-fg-muted" role={result.kind === "success" ? "status" : "alert"}>
          {result.kind === "success" ? (
            <>
              From now on you log in with <strong className="break-all text-fg">{result.email}</strong>.
            </>
          ) : result.kind === "expired" ? (
            "Links are valid for 30 minutes. Ask for a new one in Settings."
          ) : (
            `${result.message} Ask for a new link in Settings.`
          )}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          {result.kind === "success" ? (
            <>
              <Button as={Link} to="/settings/email">
                Back to settings
              </Button>
              <Button as={Link} to="/dashboard" variant="primary">
                Go to dashboard
              </Button>
            </>
          ) : (
            <Button as={Link} to="/settings/email" variant="primary">
              Request a new link
            </Button>
          )}
        </div>
      </Card>
    </Page>
  );
}
