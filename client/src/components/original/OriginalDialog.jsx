import { useState } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import toast from "../../utils/toast";
import getErrorMessage from "../../utils/getErrorMessage";
import { describeOriginal, downloadOriginal } from "../../utils/originalFile";
import Dialog from "../ui/Dialog";
import Button from "../ui/Button";
import OriginalDocument from "./OriginalDocument";

// "View original" from the editor: the uploaded file as it is, to compare while editing, with a
// download of the unchanged file and a link to its own page (ATS check of the file)
export default function OriginalDialog({ resume, onClose }) {
  const [downloading, setDownloading] = useState(false);
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
  return (
    <Dialog
      size="lg"
      title="Your original"
      description={describeOriginal(resume.original)}
      onClose={onClose}
      footer={
        <>
          <Button as={Link} to={`/resumes/${resume._id}/original`}>
            Open its page
          </Button>
          <Button variant="primary" icon={Download} onClick={download} loading={downloading}>
            Download original
          </Button>
        </>
      }
    >
      <OriginalDocument resume={resume} pages="all" />
    </Dialog>
  );
}
