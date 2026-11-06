import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import toast from "../../utils/toast";
import { Download, FileText, Moon, Plus, Search, Sun, Target, Trash2, Upload } from "lucide-react";
import { getTheme, setTheme, subscribe } from "../../utils/theme";
import { SAMPLE_RESUME } from "../../templates/sampleResume";
import Button from "../../components/ui/Button";
import BackLink from "../../components/ui/BackLink";
import { Checkbox, Field, Input, Radio, Select, Textarea, Toggle } from "../../components/ui/Form";
import Tabs from "../../components/ui/Tabs";
import { Alert, Badge, Card, CardHeader, EmptyState, PageHeader, StatCard, Tooltip } from "../../components/ui/Display";
import Dialog, { DialogPanel } from "../../components/ui/Dialog";
import Toast from "../../components/ui/Toast";
import { ProgressBar, ScoreRing } from "../../components/ui/Meter";
import ResumeThumbnail from "../../components/ui/ResumeThumbnail";

// Development only (/dev/ui): the "quiet professional" design system: its tokens
// (styles/design-system.css) and components (components/ui). The page follows the light/dark
// toggle at the top; the colour section shows both themes.

const SECTIONS = [
  ["principles", "Principles"],
  ["colors", "Colour"],
  ["type", "Type"],
  ["spacing", "Spacing"],
  ["radius", "Radius & shadow"],
  ["buttons", "Buttons"],
  ["forms", "Forms"],
  ["navigation", "Tabs"],
  ["cards", "Cards"],
  ["feedback", "Badges & alerts"],
  ["overlays", "Dialogs, toasts, tooltips"],
  ["patterns", "Page patterns"],
  ["data", "Scores & progress"],
];
const COLOR_TOKENS = [
  ["canvas", "Page background"],
  ["surface", "Cards, inputs, dialogs"],
  ["surface-2", "Quiet fills, hovers"],
  ["fg", "Text and icons"],
  ["fg-muted", "Secondary text"],
  ["fg-subtle", "Placeholders, disabled"],
  ["line", "Borders, dividers"],
  ["line-strong", "Input borders"],
  ["accent", "Primary action, links, focus"],
  ["accent-strong", "Accent hover"],
  ["accent-soft", "Selected, accent badge"],
  ["on-accent", "Text on accent"],
  ["success", "Passed, saved"],
  ["warning", "Needs attention"],
  ["danger", "Errors, delete"],
];
const TEXT_TOKENS = new Set(["fg", "fg-muted", "fg-subtle", "accent", "success", "warning", "danger"]);

// WCAG contrast between two hex colours
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

export default function DevStyleGuide() {
  const theme = useSyncExternalStore(subscribe, getTheme);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    document.title = "Design system · dev";
  }, []);

  return (
    <div className="bg-canvas font-sans text-fg">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[180px_minmax(0,1fr)]">
        <nav aria-label="Sections" className="hidden lg:block">
          <ul className="sticky top-24 space-y-1 type-small">
            {SECTIONS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="block rounded-md px-2 py-1 text-fg-muted hover:bg-surface-2 hover:text-fg">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 space-y-20">
          <PageHeader
            eyebrow="Design system · dev only"
            title="Quiet professional"
            description="One design system for every page: a warm off-white canvas, near-black ink, one ink-blue accent used sparingly, thin lines and generous space, so the resume is always the most colourful thing on screen."
            actions={
              <Button icon={theme === "dark" ? Sun : Moon} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </Button>
            }
          />

          <Section id="principles" title="Principles">
            <ul className="grid gap-4 sm:grid-cols-2">
              {[
                ["The resume is the hero", "Real page previews carry the colour. The interface stays neutral around them."],
                ["One accent, used sparingly", "Ink blue marks the one primary action per view, links, focus and selection. Never decoration."],
                ["Lines before shadows", "Thin borders separate; soft shadows only for things that float (menus, dialogs, toasts)."],
                ["Serif for page titles only", "Newsreader for the page's own heading. Inter for everything you read or click."],
                ["Space instead of boxes", "Generous gaps group content; a card is used only when something is a unit."],
                ["Same parts everywhere", "Every page builds from these components, so a button looks and behaves the same on all of them."],
              ].map(([title, text]) => (
                <li key={title} className="border-t border-line pt-4">
                  <p className="type-h3">{title}</p>
                  <p className="mt-1 type-body text-fg-muted">{text}</p>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="colors" title="Colour" description="Values are read live from the CSS tokens. Contrast is against the canvas; text tokens need 4.5:1 (fg-subtle is for placeholders only).">
            <div className="grid gap-6 xl:grid-cols-2">
              <ColorPanel themeClass="light" label="Light" />
              <ColorPanel themeClass="dark" label="Dark" />
            </div>
          </Section>

          <Section id="type" title="Type" description="Newsreader (serif) for page-level headings only; Inter for everything else. Body text in forms and cards is 15px.">
            <Card padding="none" className="divide-y divide-line overflow-hidden">
              {[
                ["type-display", "Display · Newsreader 44/49 · landing hero only", "Your resume, quietly perfect."],
                ["type-h1", "H1 · Newsreader 34/40 · every page title", "Tailor to a job"],
                ["type-h2", "H2 · Newsreader 26/32 · large section titles", "How this version differs"],
                ["type-h3", "H3 · Inter 17/26 semibold · card titles", "Skills to feature"],
                ["type-body", "Body · Inter 15/24 · text, inputs, lists", "Write it once, set it well, and check it against the job before you send it."],
                ["type-label", "Label · Inter 14/20 medium · labels, buttons, tabs", "Job description"],
                ["type-small", "Small · Inter 13/20 · help text, metadata", "Last updated 3 minutes ago"],
                ["type-eyebrow", "Eyebrow · Inter 12 medium, +4% tracking · above titles", "Step 2 of 3"],
              ].map(([cls, meta, sample]) => (
                <div key={cls} className="grid gap-2 px-5 py-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-baseline">
                  <p className="type-small text-fg-muted">
                    <code className="text-fg">{cls}</code>
                    <br />
                    {meta}
                  </p>
                  <p className={`${cls} text-fg`}>{sample}</p>
                </div>
              ))}
            </Card>
          </Section>

          <Section id="spacing" title="Spacing" description="A 4px base. Pages use 24px gutters on phones and 32px from tablet up; sections are 48–64px apart; cards have 24px padding; form fields 16px apart.">
            <div className="space-y-2">
              {[
                [4, "1", "Icon to text in small controls"],
                [8, "2", "Icon to label, chips in a row"],
                [12, "3", "Label to control, list items"],
                [16, "4", "Form fields, card content blocks"],
                [24, "6", "Card padding, page gutter (phone)"],
                [32, "8", "Page gutter (tablet+), between cards"],
                [48, "12", "Between page sections"],
                [64, "16", "Major sections, page top"],
                [96, "24", "Landing page sections"],
              ].map(([px, token, use]) => (
                <div key={px} className="grid grid-cols-[56px_48px_minmax(0,1fr)] items-center gap-4 type-small">
                  <span className="text-fg-muted tabular-nums">{px}px</span>
                  <code className="text-fg">{token}</code>
                  <span className="flex items-center gap-3">
                    <span className="h-3 rounded-sm bg-accent/70" style={{ width: px }} />
                    <span className="text-fg-muted">{use}</span>
                  </span>
                </div>
              ))}
            </div>
          </Section>

          <Section id="radius" title="Radius & shadow">
            <div className="grid gap-4 sm:grid-cols-5">
              {[
                ["rounded-sm", "4px", "Resume thumbnails, kbd"],
                ["rounded-md", "6px", "Tabs inside a segment, tooltips"],
                ["rounded-lg", "8px", "Buttons, inputs, alerts"],
                ["rounded-xl", "12px", "Cards, toasts"],
                ["rounded-2xl", "16px", "Dialogs"],
              ].map(([cls, px, use]) => (
                <div key={cls}>
                  <div className={`h-20 border border-line-strong bg-surface ${cls}`} />
                  <p className="mt-2 type-label">{px}</p>
                  <p className="type-small text-fg-muted">{use}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-4">
              {[
                ["none", "", "Most things: a border is enough"],
                ["shadow-soft", "shadow-soft", "Cards, primary buttons"],
                ["shadow-raised", "shadow-raised", "Hovered cards, thumbnails, toasts"],
                ["shadow-overlay", "shadow-overlay", "Dialogs and menus"],
              ].map(([name, cls, use]) => (
                <div key={name}>
                  <div className={`h-24 rounded-xl border border-line bg-surface ${cls}`} />
                  <p className="mt-3 type-label">{name}</p>
                  <p className="type-small text-fg-muted">{use}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="buttons" title="Buttons" description="At most one primary button per view. Danger is for destructive actions that ask for confirmation first.">
            <Card>
              <div className="grid gap-6">
                {["primary", "secondary", "ghost", "danger"].map((variant) => (
                  <div key={variant} className="grid items-center gap-3 sm:grid-cols-[100px_minmax(0,1fr)]">
                    <code className="type-small text-fg-muted">{variant}</code>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button variant={variant} size="sm">
                        Small
                      </Button>
                      <Button variant={variant}>Medium</Button>
                      <Button variant={variant} size="lg">
                        Large
                      </Button>
                      <Button variant={variant} icon={variant === "danger" ? Trash2 : Plus}>
                        {variant === "danger" ? "Delete" : "With icon"}
                      </Button>
                      <Button variant={variant} icon={Download} iconOnly aria-label="Download PDF" />
                      <Button variant={variant} loading>
                        Saving
                      </Button>
                      <Button variant={variant} disabled>
                        Disabled
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="grid items-center gap-3 sm:grid-cols-[100px_minmax(0,1fr)]">
                  <code className="type-small text-fg-muted">link</code>
                  <p className="type-body">
                    Your original stays as it is. <Button variant="link">Review changes</Button>
                  </p>
                </div>
              </div>
            </Card>
          </Section>

          <Section id="forms" title="Forms">
            <FormsDemo />
          </Section>

          <Section id="navigation" title="Tabs">
            <TabsDemo />
          </Section>

          <Section id="cards" title="Cards" description="Resume cards lead with the real first page. Cards that are links lift on hover.">
            <div className="grid gap-6 md:grid-cols-3">
              {[
                ["classic-navy", "Priya Raman – Frontend", "Updated 3 minutes ago", <Badge key="b" tone="success">ATS 92</Badge>],
                ["elegant-serif-forest", "Senior Frontend Engineer – Lumen Health", "Tailored yesterday", <Badge key="b" tone="accent">67% · Good fit</Badge>],
                ["executive-burgundy", "Product resume", "Updated last week", null],
              ].map(([templateId, title, meta, badge]) => (
                <Card key={templateId} as="a" href="#cards" interactive padding="none" className="group overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                  <div className="flex justify-center bg-surface-2 px-6 pt-6">
                    <ResumeThumbnail resume={SAMPLE_RESUME} templateId={templateId} width={180} className="-mb-16 transition-transform group-hover:-translate-y-1" />
                  </div>
                  <div className="relative border-t border-line bg-surface p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="type-label truncate">{title}</p>
                      {badge}
                    </div>
                    <p className="mt-0.5 type-small text-fg-muted">{meta}</p>
                  </div>
                </Card>
              ))}
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader title="Card with a header" description="Title in Inter, never the serif." actions={<Button size="sm">Edit</Button>} />
                <p className="type-body text-fg-muted">Body copy sits 16px below the header. Cards hold one unit of content; don't nest them.</p>
              </Card>
              <Card tone="quiet">
                <CardHeader title="Quiet card" description="surface-2, no shadow: for asides and help." />
                <p className="type-body text-fg-muted">Use for supporting information that shouldn't compete with the main card.</p>
              </Card>
            </div>
          </Section>

          <Section id="feedback" title="Badges & alerts">
            <div className="flex flex-wrap gap-2">
              <Badge>Draft</Badge>
              <Badge tone="accent">Must-have</Badge>
              <Badge tone="success">ATS-friendly</Badge>
              <Badge tone="warning">2 pages</Badge>
              <Badge tone="danger">Missing</Badge>
            </div>
            <div className="mt-6 grid gap-3">
              <Alert tone="info">We only use what's true in your resume. Missing skills are listed so you can decide what to learn or mention.</Alert>
              <Alert tone="success" title="Every check passed">Nothing to fix.</Alert>
              <Alert tone="warning" title="AI is off" action={<Button size="sm">Learn more</Button>}>
                Tailoring is limited to reordering and small fixes.
              </Alert>
              <Alert tone="danger" title="This file couldn't be read">Upload a PDF or DOCX up to 5 MB.</Alert>
            </div>
          </Section>

          <Section id="overlays" title="Dialogs, toasts, tooltips" description="No blur and no glow: a dimmed page and a plain panel.">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 type-label">Dialog</p>
                <div className="rounded-2xl border border-line bg-surface shadow-overlay">
                  <DialogPanel
                    title="Delete this application?"
                    description="The resume, cover letter and job are removed. Your base resume stays."
                    onClose={() => {}}
                    footer={
                      <>
                        <Button>Cancel</Button>
                        <Button variant="danger" icon={Trash2}>
                          Delete application
                        </Button>
                      </>
                    }
                  />
                </div>
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  Open a real dialog
                </Button>
                {dialogOpen && (
                  <Dialog
                    title="Replace the existing version?"
                    description="Same application: its cover letter and confirmed skills are kept."
                    onClose={() => setDialogOpen(false)}
                    footer={
                      <>
                        <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={() => setDialogOpen(false)}>
                          Replace
                        </Button>
                      </>
                    }
                  />
                )}
              </div>
              <div>
                <p className="mb-3 type-label">Toasts</p>
                <div className="space-y-3">
                  <Toast tone="success" message="Saved as “Senior Frontend Engineer – Lumen Health”" onDismiss={() => {}} />
                  <Toast tone="error" message="Couldn't reach the server. Try again." onDismiss={() => {}} />
                  <Toast tone="info" message="Fit to one page is on." />
                </div>
                <Button className="mt-4" onClick={() => toast.custom((t) => <Toast t={t} tone="success" message="Resume saved" onDismiss={() => toast.dismiss(t.id)} />)}>
                  Show a real toast
                </Button>
                <p className="mb-3 mt-8 type-label">Tooltip</p>
                <Tooltip content="React.js · Experience: “Built reusable React components…”">
                  <button type="button" className="rounded-full focus-visible:outline-2 focus-visible:outline-accent">
                    <Badge tone="success">React</Badge>
                  </button>
                </Tooltip>
                <span className="ml-3 type-small text-fg-muted">Hover or focus the badge</span>
              </div>
            </div>
          </Section>

          <Section id="patterns" title="Page patterns">
            <Card>
              <PageHeader
                back={
                  <div className="mb-3">
                    <BackLink onClick={() => {}}>Dashboard</BackLink>
                  </div>
                }
                eyebrow="Step 2 of 3"
                title="Tailor to a job"
                description="A copy of your resume aimed at one job. Your original stays as it is."
                actions={
                  <>
                    <Button icon={Upload}>Upload</Button>
                    <Button variant="primary" icon={Target}>
                      Tailor my resume
                    </Button>
                  </>
                }
              />
            </Card>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <EmptyState icon={FileText} title="No resumes yet" description="Start from scratch, or upload the resume you already have and we'll read it in." action={<Button variant="primary" icon={Plus}>Create a resume</Button>} />
              <EmptyState icon={Search} title="No saved jobs" description="Paste a job description to see how well your resume matches it." action={<Button>Tailor to a job</Button>} />
            </div>
          </Section>

          <Section id="data" title="Scores & progress" description="The number is in the serif; the ring is thin. ATS scores use the status colours, job matches use the accent.">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="ATS score" value="92" unit="/ 100" note="+14 since the last check" tone="success" />
              <StatCard label="Job match" value="67" unit="%" note="6 of 9 must-haves" />
              <StatCard label="Applications" value="4" note="1 cover letter to finish" tone="warning" />
              <StatCard label="Words changed" value="2" unit="%" note="Nearly identical to your base resume" tone="danger" />
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-[auto_minmax(0,1fr)]">
              <Card className="flex flex-wrap items-center justify-center gap-8">
                <ScoreRing value={92} label="Excellent" />
                <ScoreRing value={67} label="Good fit" caption="% match" tone="accent" />
                <ScoreRing value={41} label="Needs work" />
              </Card>
              <Card className="space-y-5">
                <ProgressBar label="Parseability" value={25} max={25} tone="auto" />
                <ProgressBar label="Keywords" value={14} max={25} tone="auto" />
                <ProgressBar label="Content quality" value={9} max={25} tone="auto" />
                <ProgressBar label="Must-haves" value={6} max={9} display="6 of 9" />
              </Card>
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}

function Section({ id, title, description, children }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
      <h2 id={`${id}-title`} className="type-h2">
        {title}
      </h2>
      {description && <p className="mt-2 max-w-3xl type-body text-fg-muted">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

// The colour tokens of one theme, read from the CSS inside a .light / .dark wrapper
function ColorPanel({ themeClass, label }) {
  const ref = useRef(null);
  const [values, setValues] = useState({});
  useEffect(() => {
    const style = getComputedStyle(ref.current);
    setValues(Object.fromEntries(COLOR_TOKENS.map(([name]) => [name, style.getPropertyValue(`--ds-${name}`).trim()])));
  }, []);

  return (
    <div ref={ref} className={`${themeClass} rounded-xl border border-line bg-canvas p-5 text-fg`}>
      <p className="type-h3">{label}</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {COLOR_TOKENS.map(([name, use]) => {
          const value = values[name] ?? "";
          const ratio = TEXT_TOKENS.has(name) && /^#[0-9a-f]{6}$/i.test(value) && values.canvas ? contrast(value, values.canvas) : null;
          return (
            <li key={name} className="flex items-center gap-3">
              <span className="size-9 shrink-0 rounded-lg border border-line" style={{ background: `var(--ds-${name})` }} />
              <span className="min-w-0 type-small">
                <code className="text-fg">{name}</code> <span className="text-fg-subtle">{value}</span>
                <span className="block truncate text-fg-muted">
                  {use}
                  {ratio && ` · ${ratio.toFixed(1)}:1`}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <Button variant="primary" size="sm">
          Primary
        </Button>
        <Button size="sm">Secondary</Button>
        <Badge tone="accent">Accent</Badge>
        <span className="type-small text-fg-muted">Secondary text on canvas</span>
      </div>
    </div>
  );
}

function FormsDemo() {
  const [toggle, setToggle] = useState(true);
  return (
    <Card>
      <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
        <Field label="Full name">{(props) => <Input {...props} defaultValue="Priya Raman" />}</Field>
        <Field label="Email" help="We'll only use it to send your password reset link.">
          {(props) => <Input {...props} type="email" placeholder="you@example.com" />}
        </Field>
        <Field label="Job title" error="Please enter the job title.">{(props) => <Input {...props} defaultValue="" />}</Field>
        <Field label="Company" optional>
          {(props) => <Input {...props} disabled defaultValue="Lumen Health" />}
        </Field>
        <Field label="Template">
          {(props) => (
            <Select {...props} defaultValue="classic">
              <option value="classic">Classic Navy</option>
              <option value="modern">Modern Line Teal</option>
              <option value="elegant">Elegant Serif Forest</option>
            </Select>
          )}
        </Field>
        <Field label="Language">
          {(props) => (
            <Select {...props}>
              <option>English</option>
              <option>German (Deutsch)</option>
            </Select>
          )}
        </Field>
        <div className="md:col-span-2">
          <Field label="Job description" help="Paste the whole ad: the role, what you'd do and the requirements.">
            {(props) => <Textarea {...props} placeholder="Paste the full job posting here…" />}
          </Field>
        </div>
        <fieldset className="space-y-3">
          <legend className="mb-2 type-label">Projects to include</legend>
          <Checkbox label="Tidepool" description="Matches the job well" defaultChecked />
          <Checkbox label="Budget Buddy" description="Nothing the job asks for" />
          <Checkbox label="Archived project" disabled />
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="mb-2 type-label">How much to rewrite</legend>
          <Radio name="strength" label="Light" description="Headline and summary only" />
          <Radio name="strength" label="Balanced" description="The most relevant half of your bullets" defaultChecked />
          <Radio name="strength" label="Strong" description="Every bullet that relates to the job" />
        </fieldset>
        <div className="space-y-3">
          <Toggle checked={toggle} onChange={setToggle} label="Fit to one page" />
          <br />
          <Toggle checked={false} onChange={() => {}} label="Disabled" disabled />
        </div>
      </div>
    </Card>
  );
}

function TabsDemo() {
  const [page, setPage] = useState("report");
  const [segment, setSegment] = useState("content");
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <p className="mb-3 type-small text-fg-muted">Underline: views of one page</p>
        <Tabs
          label="Results"
          value={page}
          onChange={setPage}
          tabs={[
            { id: "report", label: "Report" },
            { id: "ats", label: "What the ATS sees" },
            { id: "history", label: "History", count: 3 },
          ]}
        />
        <p className="mt-4 type-body text-fg-muted">Showing: {page}</p>
      </div>
      <div>
        <p className="mb-3 type-small text-fg-muted">Segmented: a switch inside a card</p>
        <Tabs
          label="Editor panel"
          variant="segmented"
          value={segment}
          onChange={setSegment}
          tabs={[
            { id: "content", label: "Content" },
            { id: "design", label: "Design" },
          ]}
        />
        <p className="mt-4 type-body text-fg-muted">Showing: {segment}</p>
      </div>
    </div>
  );
}
