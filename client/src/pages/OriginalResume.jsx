import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Download, FileSearch, PenLine } from "lucide-react";
import api from "../api/axios";
import toast from "../utils/toast";
import usePageTitle from "../hooks/usePageTitle";
import getErrorMessage from "../utils/getErrorMessage";
import { describeOriginal, downloadOriginal } from "../utils/originalFile";
import Loader from "../components/Loader";
import OriginalDocument from "../components/original/OriginalDocument";
import MatchedDesign from "../components/original/MatchedDesign";
import { saveChosenTemplate, saveMatchedTemplate, useMatchedDesign } from "../components/original/applyTemplate";
import TemplatePicker from "../components/editor/TemplatePicker";
import { pageClass } from "../components/ui/pageLayout";
import { Badge, PageHeader } from "../components/ui/Display";
import Button from "../components/ui/Button";
import BackLink from "../components/ui/BackLink";
import Dialog from "../components/ui/Dialog";

// An imported resume's original file (/resumes/:id/original): the file exactly as it was
// uploaded, with what the user can do with it: download it unchanged, check its ATS score, or
// edit it in a matching template (?match=1 opens that straight away).
export default function OriginalResume() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [resume, setResume] = useState(null);
  const [failed, setFailed] = useState("");
  const [step, setStep] = useState(searchParams.get("match") ? "match" : null); // null | "match" | "choose"
  const [saving, setSaving] = useState(false);
  const [savingTemplateId, setSavingTemplateId] = useState(null);
  const [downloading, setDownloading] = useState(false);
  usePageTitle(resume ? `${resume.title} · Original` : "Your original");
  const match = useMatchedDesign(resume);

  useEffect(() => {
    let ignore = false;
    api
      .get(`/resumes/${id}`)
      .then(({ data }) => !ignore && setResume(data))
      .catch((error) => !ignore && setFailed(getErrorMessage(error)));
    return () => {
      ignore = true;
    };
  }, [id]);

  const openInEditor = async (save, setBusy) => {
    setBusy(true);
    try {
      await save();
      navigate(`/editor/${id}`);
    } catch (error) {
      toast.error(`Couldn't save the template: ${getErrorMessage(error)}`);
      setBusy(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      await downloadOriginal(resume);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDownloading(false);
    }
  };

  if (failed) {
    return (
      <div className={pageClass("narrow", "text-center")}>
        <h1 className="type-h2 text-fg">We couldn't open this resume</h1>
        <p className="mt-2 type-body text-fg-muted">{failed}</p>
        <Button as={Link} to="/dashboard" variant="primary" className="mt-6">
          Back to dashboard
        </Button>
      </div>
    );
  }
  if (!resume) return <Loader text="Opening your original..." />;
  if (!resume.original) {
    return (
      <div className={pageClass("narrow", "text-center")}>
        <h1 className="type-h2 text-fg">No uploaded original</h1>
        <p className="mt-2 type-body text-fg-muted">This resume was made in the editor, so there's no uploaded file to show.</p>
        <Button as={Link} to={`/editor/${id}`} variant="primary" className="mt-6">
          Open in editor
        </Button>
      </div>
    );
  }

  const edited = Boolean(resume.template); // A template was chosen: the editable version exists
  if (step === "choose") {
    return (
      <TemplatePicker
        resume={resume}
        fullScreen
        title="Choose a template for your resume"
        description="Every template below is filled with your resume, in your section order. Pick one to continue."
        closeLabel="Back"
        savingId={savingTemplateId}
        onSelect={(template) => openInEditor(() => saveChosenTemplate(id, template.id, match), (on) => setSavingTemplateId(on ? template.id : null))}
        onClose={() => setStep("match")}
      />
    );
  }

  return (
    <div className={pageClass()}>
      <PageHeader
        back={
          <div className="mb-3">
            <BackLink to="/dashboard">Dashboard</BackLink>
          </div>
        }
        eyebrow="Your original"
        title={resume.title}
        description={`${describeOriginal(resume.original)}. Exactly as you uploaded it.`}
        actions={
          <>
            <Button icon={Download} onClick={download} loading={downloading}>
              Download
            </Button>
            <Button icon={FileSearch} onClick={() => navigate(`/ats-checker?original=${id}`)}>
              Check ATS score
            </Button>
            {edited ? (
              <Button as={Link} to={`/editor/${id}`} variant="primary" icon={PenLine}>
                Open in editor
              </Button>
            ) : (
              <Button variant="primary" icon={PenLine} onClick={() => setStep("match")}>
                Edit with a matching template
              </Button>
            )}
          </>
        }
      />
      {resume.atsScore && (
        <p className="mt-4 flex items-center gap-2 type-small text-fg-muted">
          <Badge tone={resume.atsScore.score >= 70 ? "success" : resume.atsScore.score >= 50 ? "warning" : "danger"}>ATS {resume.atsScore.score}</Badge>
          Last ATS check
        </p>
      )}

      <div className="mx-auto mt-8 max-w-3xl" data-testid="original-view">
        <OriginalDocument resume={resume} pages="all" />
      </div>

      {step === "match" && (
        <Dialog size="lg" title="Edit with a matching template" onClose={() => setStep(null)}>
          <MatchedDesign resume={resume} onUse={(matched) => openInEditor(() => saveMatchedTemplate(id, matched), setSaving)} onChooseOther={() => setStep("choose")} busy={saving} />
        </Dialog>
      )}
    </div>
  );
}
