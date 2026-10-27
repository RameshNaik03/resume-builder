import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import HardBreak from "@tiptap/extension-hard-break";
import { Placeholder, UndoRedo } from "@tiptap/extensions";
import { Bold as BoldIcon, Italic as ItalicIcon, Link2, Underline as UnderlineIcon, Unlink } from "lucide-react";
import { toHtml } from "../../utils/richText";

// A bullet point is a single paragraph (Enter does nothing)
const SingleLineDocument = Document.extend({ content: "paragraph" });

// "github.com/me" -> "https://github.com/me", "me@mail.com" -> "mailto:me@mail.com"
const normalizeUrl = (url) => {
  if (/^(https?:|mailto:)/i.test(url)) return url;
  if (/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(url)) return `mailto:${url}`;
  return `https://${url}`;
};

// Editor HTML -> the value we store ("" when empty; bullet points without the <p> wrapper)
const toStoredHtml = (editor, inline) => {
  if (editor.isEmpty) return "";
  const html = editor.getHTML();
  return inline ? html.replace(/^<p>/, "").replace(/<\/p>$/, "") : html;
};

// One toolbar button. onMouseDown + preventDefault keeps the text selected while clicking it.
function ToolbarButton({ label, shortcut, active, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      aria-label={label}
      aria-pressed={Boolean(active)}
      title={shortcut ? `${label} (${shortcut})` : label}
      className={`grid size-7 place-items-center rounded-md transition ${
        active
          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      }`}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}

// Small rich text editor: bold, italic, underline and links (Ctrl+B / Ctrl+I / Ctrl+U / Ctrl+K).
//   value    - stored HTML, or plain text from older resumes (converted automatically)
//   onChange - receives the new HTML ("" when empty)
//   inline   - one line, no paragraphs (bullet points)
//   toolbar  - "always", or "focus" to show it only while editing (keeps long lists tidy)
export default function RichTextEditor({ value, onChange, inline = false, placeholder = "", ariaLabel, toolbar = "always", minHeight }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const linkInputRef = useRef(null);

  // Refs so the editor (created once) always calls the latest props / state (updated below)
  const onChangeRef = useRef(onChange);
  const openLinkRef = useRef(() => {});
  const lastValueRef = useRef(value); // The last value we sent or loaded

  const editor = useEditor({
    extensions: [
      inline ? SingleLineDocument : Document,
      Paragraph,
      Text,
      Bold,
      Italic,
      Underline,
      ...(inline ? [] : [HardBreak]),
      Link.extend({
        // Ctrl+K / Cmd+K opens the link field
        addKeyboardShortcuts: () => ({ "Mod-k": () => (openLinkRef.current(), true) }),
      }).configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: "https",
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      UndoRedo,
      Placeholder.configure({ placeholder }),
    ],
    content: toHtml(value, { inline }),
    shouldRerenderOnTransaction: false, // Only the toolbar re-renders (via useEditorState)
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": ariaLabel,
        "aria-multiline": String(!inline),
        ...(minHeight && { style: `min-height: ${minHeight}` }),
      },
    },
    onUpdate: ({ editor: current }) => {
      const html = toStoredHtml(current, inline);
      lastValueRef.current = html;
      onChangeRef.current(html);
    },
  });

  // The value changed from outside (e.g. the bullet above this one was removed): load it
  useEffect(() => {
    if (!editor || value === lastValueRef.current) return;
    lastValueRef.current = value;
    editor.commands.setContent(toHtml(value, { inline }), { emitUpdate: false });
  }, [editor, value, inline]);

  // Which buttons are active (re-renders only when these change)
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive("bold") ?? false,
      italic: current?.isActive("italic") ?? false,
      underline: current?.isActive("underline") ?? false,
      link: current?.isActive("link") ?? false,
    }),
  });

  const openLink = () => {
    setLinkUrl(editor?.getAttributes("link").href ?? "");
    setLinkOpen(true);
    setTimeout(() => linkInputRef.current?.focus());
  };

  // Keep the refs pointing at the latest onChange / openLink
  useLayoutEffect(() => {
    onChangeRef.current = onChange;
    openLinkRef.current = openLink;
  });

  const applyLink = () => {
    const url = linkUrl.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!url) {
      chain.unsetLink().run();
    } else if (editor.state.selection.empty && !editor.isActive("link")) {
      // Nothing selected: insert the address itself as a link
      const href = normalizeUrl(url);
      chain.insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      chain.setLink({ href: normalizeUrl(url) }).run();
    }
    setLinkOpen(false);
  };

  return (
    <div className="rich-editor group">
      <div
        className={`items-center gap-0.5 border-b border-slate-200 px-1.5 py-1 dark:border-slate-800 ${
          toolbar === "focus" && !linkOpen ? "hidden group-focus-within:flex" : "flex"
        }`}
        role="toolbar"
        aria-label="Text formatting"
      >
        <ToolbarButton label="Bold" shortcut="Ctrl+B" active={active?.bold} icon={BoldIcon} onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolbarButton label="Italic" shortcut="Ctrl+I" active={active?.italic} icon={ItalicIcon} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolbarButton
          label="Underline"
          shortcut="Ctrl+U"
          active={active?.underline}
          icon={UnderlineIcon}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <ToolbarButton label={active?.link ? "Edit link" : "Add link"} shortcut="Ctrl+K" active={active?.link || linkOpen} icon={Link2} onClick={openLink} />
        {active?.link && (
          <ToolbarButton
            label="Remove link"
            active={false}
            icon={Unlink}
            onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}
          />
        )}
      </div>

      {linkOpen && (
        <div className="flex items-center gap-2 border-b border-slate-200 px-2 py-1.5 dark:border-slate-800">
          <input
            ref={linkInputRef}
            type="text"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyLink();
              } else if (event.key === "Escape") {
                event.preventDefault();
                setLinkOpen(false);
                editor.commands.focus();
              }
            }}
            placeholder="https://example.com or name@mail.com"
            aria-label="Link address"
            className="min-w-0 flex-1 rounded-md border border-slate-300 bg-transparent px-2 py-1 text-sm outline-none focus:border-indigo-500 dark:border-slate-700"
          />
          <button type="button" onClick={applyLink} className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700">
            {linkUrl.trim() ? "Apply" : "Remove"}
          </button>
          <button
            type="button"
            onClick={() => {
              setLinkOpen(false);
              editor.commands.focus();
            }}
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
