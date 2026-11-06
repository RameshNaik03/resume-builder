import StepProgress from "../ui/StepProgress";
import { ANALYZE_STEPS } from "./atsHelpers";

// step = index of the step in progress; ANALYZE_STEPS.length means all done
export default function AnalyzeProgress({ step, fileName }) {
  return <StepProgress title="Analyzing your resume" detail={fileName} steps={ANALYZE_STEPS} current={step} note="Usually a few seconds; up to a minute when AI feedback is on." />;
}
