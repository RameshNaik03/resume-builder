import { useEffect, useId, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, RotateCcw } from "lucide-react";
import { getTemplate } from "../../templates/registry";
import {
  BULLET_STYLES,
  COLOR_PALETTES,
  DATE_FORMATS,
  DESIGN_GROUPS,
  DIVIDER_STYLES,
  FONT_OPTIONS,
  LIMITS,
  MARGIN_PRESETS,
  PAGE_SIZES,
  SECTIONS,
  SIDE_RATIOS,
  SKILLS_DISPLAYS,
  fontStack,
  getDesignDefaults,
  resolveDesign,
  sameValue,
} from "../../templates/design";
import { loadAllFonts } from "../../templates/fonts";
import SectionOrderList from "./SectionOrderList";

// Segmented-control id for "no override" (null can't be an option id)
const DEFAULT = "default";

// The editor's "Design" tab: fonts, sizes, spacing, page size and colours for this resume.
// Only the settings the user changes are stored in resume.design (see templates/design.js);
// everything else follows the template. Each change updates the preview straight away,
// and the editor's autosave stores it.
export default function DesignPanel({ resume, onChange }) {
  const template = getTemplate(resume.template);
  const defaults = getDesignDefaults(template);
  const { resolved, overrides } = resolveDesign(template, resume.design);

  // Load every font so each option in the font pickers can preview itself
  useEffect(loadAllFonts, []);

  // Apply changes; null removes a setting (back to the template default)
  const update = (changes) => {
    const next = { ...overrides, ...changes };
    for (const key of Object.keys(next)) if (next[key] == null) delete next[key];
    onChange(next);
  };
  const reset = (keys) => update(Object.fromEntries(keys.map((key) => [key, null])));
  const isChanged = (keys) => keys.some((key) => key in overrides);
  const groupProps = (group) => ({ changed: isChanged(DESIGN_GROUPS[group]), onReset: () => reset(DESIGN_GROUPS[group]) });
  // Stores a value only if it differs from the template default (lists compared by content)
  const set = (key, value) => update({ [key]: sameValue(value, defaults[key]) ? null : value });

  const headings = overrides.sectionHeadings ?? {};
  const renameSection = (id, value) => {
    const next = { ...headings, [id]: value };
    if (!value.trim()) delete next[id];
    update({ sectionHeadings: Object.keys(next).length > 0 ? next : null });
  };
  const toggleSection = (id) => {
    const hidden = resolved.hiddenSections.includes(id)
      ? resolved.hiddenSections.filter((hiddenId) => hiddenId !== id)
      : [...resolved.hiddenSections, id];
    update({ hiddenSections: hidden.length > 0 ? hidden : null });
  };
  const toggleSide = (id) => {
    const inSide = resolved.sideSections.includes(id);
    // Kept in the standard section order so the stored value doesn't depend on click order
    set("sideSections", SECTIONS.map((s) => s.id).filter((sectionId) => (sectionId === id ? !inSide : resolved.sideSections.includes(sectionId))));
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">Design</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Customise {template.name}. Changes apply to this resume only.
          </p>
        </div>
        <button type="button" onClick={() => onChange({})} disabled={Object.keys(overrides).length === 0} className="btn-secondary">
          <RotateCcw className="size-4" aria-hidden="true" />
          Reset everything
        </button>
      </div>

      {/* ---------- Sections ---------- */}
      <Group title="Sections" {...groupProps("sections")}>
        <p className="-mt-2 text-sm text-slate-500 dark:text-slate-400">
          Drag to reorder, rename headings, or hide a section. Empty sections never show.
        </p>
        <SectionOrderList
          order={resolved.sectionOrder}
          hidden={resolved.hiddenSections}
          headings={headings}
          defaultTitles={defaults.sectionHeadings}
          onReorder={(sectionOrder) => set("sectionOrder", sectionOrder)}
          onToggle={toggleSection}
          onRename={renameSection}
        />
      </Group>

      {/* ---------- Layout ---------- */}
      <Group title="Layout" {...groupProps("layout")}>
        <Segmented
          label="Columns"
          value={resolved.columns}
          options={[
            { id: 1, label: "One column" },
            { id: 2, label: "Two columns" },
          ]}
          onChange={(columns) => set("columns", columns)}
        />
        {resolved.columns === 2 && (
          <>
            <fieldset>
              <legend className="label">Side column</legend>
              <p className="-mt-1 mb-2 text-xs text-slate-500 dark:text-slate-400">
                {template.layout === "sidebar"
                  ? "These sections go in the coloured sidebar."
                  : "These sections go in the narrow column; the rest stay in the main one."}
              </p>
              <div className="flex flex-wrap gap-2">
                {SECTIONS.map((section) => {
                  const inSide = resolved.sideSections.includes(section.id);
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => toggleSide(section.id)}
                      aria-pressed={inSide}
                      className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                        inSide
                          ? "bg-indigo-600 text-white"
                          : "text-slate-700 ring-1 ring-slate-200 hover:ring-indigo-300 dark:text-slate-300 dark:ring-slate-700"
                      }`}
                    >
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <Segmented
              label="Column widths (side / main)"
              value={resolved.sideRatio}
              options={SIDE_RATIOS.map((ratio) => ({ id: ratio, label: `${ratio} / ${100 - ratio}` }))}
              onChange={(sideRatio) => set("sideRatio", sideRatio)}
            />
          </>
        )}
        <Segmented
          label="Header alignment"
          value={resolved.headerAlign}
          options={[
            { id: "left", label: "Left", icon: AlignLeft },
            { id: "center", label: "Center", icon: AlignCenter },
            { id: "right", label: "Right", icon: AlignRight },
          ]}
          onChange={(headerAlign) => set("headerAlign", headerAlign)}
        />
        <Segmented
          label="Skills"
          value={resolved.skillsDisplay ?? DEFAULT}
          options={[{ id: DEFAULT, label: "Template style" }, ...Object.entries(SKILLS_DISPLAYS).map(([id, label]) => ({ id, label }))]}
          onChange={(skillsDisplay) => set("skillsDisplay", skillsDisplay === DEFAULT ? null : skillsDisplay)}
        />
        <Segmented
          label="Dates"
          value={resolved.dateFormat ?? DEFAULT}
          options={[{ id: DEFAULT, label: "As typed" }, ...Object.entries(DATE_FORMATS).map(([id, label]) => ({ id, label }))]}
          onChange={(dateFormat) => set("dateFormat", dateFormat === DEFAULT ? null : dateFormat)}
        />
        <Segmented
          label="Bullets"
          value={resolved.bulletStyle}
          options={Object.entries(BULLET_STYLES).map(([id, style]) => ({ id, label: style.label, title: style.name }))}
          onChange={(bulletStyle) => set("bulletStyle", bulletStyle)}
        />
      </Group>

      {/* ---------- Typography ---------- */}
      <Group title="Typography" {...groupProps("typography")}>
        <FontPicker
          label="Body font"
          value={resolved.fontFamily}
          defaultLabel="Template font"
          defaultStack={template.theme.fontFamily}
          onChange={(fontFamily) => update({ fontFamily })}
        />
        <FontPicker
          label="Heading font"
          value={resolved.headingFontFamily}
          defaultLabel="Same as body"
          defaultStack="inherit"
          onChange={(headingFontFamily) => update({ headingFontFamily })}
        />
        <Slider
          label="Font size"
          value={resolved.baseFontSize}
          limits={LIMITS.baseFontSize}
          format={(v) => `${v} pt`}
          isDefault={!("baseFontSize" in overrides)}
          onChange={(baseFontSize) => update({ baseFontSize: baseFontSize === defaults.baseFontSize ? null : baseFontSize })}
        />
        <Slider
          label="Heading size"
          value={resolved.headingSize}
          limits={LIMITS.headingSize}
          format={(v) => `${v}%`}
          isDefault={!("headingSize" in overrides)}
          onChange={(headingSize) => update({ headingSize: headingSize === defaults.headingSize ? null : headingSize })}
        />
        <Slider
          label="Line height"
          value={resolved.lineHeight}
          limits={LIMITS.lineHeight}
          format={(v) => v.toFixed(2)}
          isDefault={!("lineHeight" in overrides)}
          onChange={(lineHeight) => update({ lineHeight: lineHeight === defaults.lineHeight ? null : lineHeight })}
        />
      </Group>

      {/* ---------- Spacing ---------- */}
      <Group title="Spacing" {...groupProps("spacing")}>
        <Slider
          label="Paragraph spacing"
          hint="Between entries and bullet points"
          value={resolved.paragraphSpacing}
          limits={LIMITS.paragraphSpacing}
          format={(v) => `${Math.round(v * 100)}%`}
          isDefault={!("paragraphSpacing" in overrides)}
          onChange={(paragraphSpacing) =>
            update({ paragraphSpacing: paragraphSpacing === defaults.paragraphSpacing ? null : paragraphSpacing })
          }
        />
        <Slider
          label="Section spacing"
          hint="Above each section"
          value={resolved.sectionSpacing}
          limits={LIMITS.sectionSpacing}
          format={(v) => `${Math.round(v * 100)}%`}
          isDefault={!("sectionSpacing" in overrides)}
          onChange={(sectionSpacing) => update({ sectionSpacing: sectionSpacing === defaults.sectionSpacing ? null : sectionSpacing })}
        />
        <MarginControls resolved={resolved} defaults={defaults} onChange={update} />
      </Group>

      {/* ---------- Page ---------- */}
      <Group title="Page" {...groupProps("page")}>
        <Segmented
          label="Paper size"
          value={resolved.pageSize}
          options={Object.entries(PAGE_SIZES).map(([id, page]) => ({ id, label: page.label, detail: page.detail }))}
          onChange={(pageSize) => update({ pageSize: pageSize === defaults.pageSize ? null : pageSize })}
        />
      </Group>

      {/* ---------- Colors ---------- */}
      <Group title="Colors" {...groupProps("colors")}>
        <div>
          <p className="label">Palettes</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {COLOR_PALETTES.map((palette) => {
              const active = ["accentColor", "textColor", "headingColor", "backgroundColor", "dividerColor"].every(
                (key) => overrides[key] === palette[key]
              );
              return (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => {
                    const { accentColor, textColor, headingColor, backgroundColor, dividerColor } = palette;
                    update({ accentColor, textColor, headingColor, backgroundColor, dividerColor });
                  }}
                  aria-pressed={active}
                  className={`rounded-lg p-2 text-left text-xs font-medium transition ${
                    active
                      ? "bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"
                      : "text-slate-700 ring-1 ring-slate-200 hover:ring-indigo-300 dark:text-slate-300 dark:ring-slate-700"
                  }`}
                >
                  <span className="flex overflow-hidden rounded ring-1 ring-black/10" aria-hidden="true">
                    {[palette.accentColor, palette.headingColor, palette.textColor, palette.dividerColor, palette.backgroundColor].map(
                      (hex, i) => (
                        <span key={i} className="h-5 flex-1" style={{ backgroundColor: hex }} />
                      )
                    )}
                  </span>
                  <span className="mt-1.5 block truncate">{palette.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ColorField label="Accent" value={resolved.accentColor} onChange={(accentColor) => update({ accentColor })} />
          <ColorField label="Text" value={resolved.textColor} onChange={(textColor) => update({ textColor })} />
          <ColorField label="Headings" value={resolved.headingColor} onChange={(headingColor) => update({ headingColor })} />
          <ColorField label="Background" value={resolved.backgroundColor} onChange={(backgroundColor) => update({ backgroundColor })} />
          <ColorField label="Dividers" value={resolved.dividerColor} onChange={(dividerColor) => update({ dividerColor })} />
        </div>

        <Segmented
          label="Divider style"
          value={resolved.dividerStyle}
          options={Object.entries(DIVIDER_STYLES).map(([id, style]) => ({ id, label: style.label }))}
          onChange={(dividerStyle) => update({ dividerStyle: dividerStyle === defaults.dividerStyle ? null : dividerStyle })}
        />
      </Group>
    </div>
  );
}

// A card for one group of controls, with its own "Reset" button
function Group({ title, changed, onReset, children }) {
  return (
    <section className="card p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
        <button
          type="button"
          onClick={onReset}
          disabled={!changed}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:cursor-default disabled:text-slate-400 disabled:hover:bg-transparent dark:text-indigo-400 dark:hover:bg-indigo-950/60 dark:disabled:text-slate-600"
          title={`Reset ${title.toLowerCase()} to the template defaults`}
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset
        </button>
      </div>
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

// Grid of fonts, each name drawn in its own font. value null = the template's choice.
function FontPicker({ label, value, defaultLabel, defaultStack, onChange }) {
  const options = [{ id: null, name: defaultLabel, category: "Default", stack: defaultStack }].concat(
    FONT_OPTIONS.map((font) => ({ ...font, stack: fontStack(font) }))
  );

  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((font) => {
          const selected = value === font.id;
          return (
            <button
              key={font.id ?? "default"}
              type="button"
              onClick={() => onChange(font.id)}
              aria-pressed={selected}
              className={`rounded-lg px-3 py-2 text-left transition ${
                selected
                  ? "bg-indigo-50 ring-2 ring-indigo-600 dark:bg-indigo-950/60"
                  : "ring-1 ring-slate-200 hover:ring-indigo-300 dark:ring-slate-700"
              }`}
            >
              <span className="block truncate text-base text-slate-900 dark:text-white" style={{ fontFamily: font.stack }}>
                {font.name}
              </span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">{font.category}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function Slider({ label, hint, value, limits, format, isDefault, onChange }) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="label mb-0">
          {label}
          {hint && <span className="ml-1.5 font-normal text-slate-400 dark:text-slate-500">{hint}</span>}
        </label>
        <span className="text-sm text-slate-600 tabular-nums dark:text-slate-300">
          {format(value)}
          {isDefault && <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">(default)</span>}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={limits.min}
        max={limits.max}
        step={limits.step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-indigo-600"
      />
    </div>
  );
}

// Row of toggle buttons (one choice)
function Segmented({ label, value, options, onChange }) {
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={value === option.id}
            aria-label={option.title}
            title={option.title}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              value === option.id
                ? "bg-indigo-600 text-white"
                : "text-slate-700 ring-1 ring-slate-200 hover:ring-indigo-300 dark:text-slate-300 dark:ring-slate-700"
            }`}
          >
            {option.icon && <option.icon className="size-4" aria-hidden="true" />}
            {option.label}
            {option.detail && <span className="ml-1.5 text-xs opacity-75">{option.detail}</span>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const MARGIN_SIDES = [
  { key: "marginTop", label: "Top" },
  { key: "marginRight", label: "Right" },
  { key: "marginBottom", label: "Bottom" },
  { key: "marginLeft", label: "Left" },
];

// Narrow / Normal (template) / Wide presets, plus custom values in mm
function MarginControls({ resolved, defaults, onChange }) {
  const matches = (values) => MARGIN_SIDES.every(({ key }) => resolved[key] === values[key]);
  const presets = [
    { id: "narrow", label: "Narrow", values: MARGIN_PRESETS.narrow },
    { id: "normal", label: "Normal", values: defaults },
    { id: "wide", label: "Wide", values: MARGIN_PRESETS.wide },
  ];
  const active = presets.find((preset) => matches(preset.values))?.id ?? "custom";

  return (
    <div>
      <Segmented
        label="Margins"
        value={active}
        options={[...presets, { id: "custom", label: "Custom" }]}
        onChange={(id) => {
          if (id === "normal") onChange(Object.fromEntries(MARGIN_SIDES.map(({ key }) => [key, null])));
          else if (id !== "custom") onChange(MARGIN_PRESETS[id]);
        }}
      />
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MARGIN_SIDES.map(({ key, label }) => (
          <MarginInput
            key={key}
            label={label}
            value={resolved[key]}
            onChange={(value) => onChange({ [key]: value === defaults[key] ? null : value })}
          />
        ))}
      </div>
    </div>
  );
}

// Number field that lets you type freely (e.g. "3" on the way to "30") and only
// applies values inside the allowed range
function MarginInput({ label, value, onChange }) {
  const id = useId();
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const { min, max } = LIMITS.margin;
  const shown = focused ? text : String(value); // Follow outside changes (presets) unless typing

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
        {label} (mm)
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={LIMITS.margin.step}
        value={shown}
        onFocus={() => {
          setText(String(value));
          setFocused(true);
        }}
        onChange={(event) => {
          setText(event.target.value);
          const number = Number(event.target.value);
          if (event.target.value !== "" && number >= min && number <= max) onChange(number);
        }}
        onBlur={() => setFocused(false)} // An invalid entry snaps back to the saved value
        className="input"
      />
    </div>
  );
}

function ColorField({ label, value, onChange }) {
  const id = useId();
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-slate-300 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-950"
      />
      <label htmlFor={id} className="min-w-0">
        <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className="block font-mono text-xs text-slate-500 uppercase dark:text-slate-400">{value}</span>
      </label>
    </div>
  );
}
