import { Link, Navigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Database, KeyRound, Laptop, Mail, SlidersHorizontal, UserRound } from "lucide-react";
import usePageTitle from "../hooks/usePageTitle";
import Page from "../components/ui/Page";
import { PageHeader } from "../components/ui/Display";
import ProfileSection from "../components/settings/ProfileSection";
import EmailSection from "../components/settings/EmailSection";
import PasswordSection from "../components/settings/PasswordSection";
import SessionsSection from "../components/settings/SessionsSection";
import PreferencesSection from "../components/settings/PreferencesSection";
import DataSection from "../components/settings/DataSection";

// Account settings: /settings and /settings/:section.
//   Desktop (768px and up): the sections in a side nav on the left, the open one on the right
//     (/settings opens Profile).
//   Phones: /settings is the list of sections; each opens on its own page with a link back.
const SECTIONS = [
  { id: "profile", label: "Profile", description: "Name, photo and contact details", icon: UserRound, Component: ProfileSection },
  { id: "email", label: "Email", description: "The address you log in with", icon: Mail, Component: EmailSection },
  { id: "password", label: "Password", description: "Change your password", icon: KeyRound, Component: PasswordSection },
  { id: "sessions", label: "Sessions", description: "Devices you're logged in on", icon: Laptop, Component: SessionsSection },
  { id: "preferences", label: "Preferences", description: "Theme, language, template and dates", icon: SlidersHorizontal, Component: PreferencesSection },
  { id: "data", label: "Your data", description: "Download or delete everything", icon: Database, Component: DataSection },
];

export default function Settings() {
  const { section } = useParams();
  const current = SECTIONS.find((entry) => entry.id === section);
  usePageTitle(current ? `${current.label} settings` : "Settings");
  if (section && !current) return <Navigate to="/settings" replace />;

  const shown = current ?? SECTIONS[0];
  const { Component } = shown;

  return (
    <Page>
      <PageHeader title="Settings" description="Your account, how the app works for you, and your data." />

      <div className="mt-8 md:flex md:items-start md:gap-10">
        {/* The list (phones, at /settings) or the side nav (desktop) */}
        <nav aria-label="Settings" className={`md:sticky md:top-24 md:w-56 md:shrink-0 ${section ? "max-md:hidden" : ""}`}>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface md:divide-y-0 md:rounded-none md:border-0 md:bg-transparent">
            {SECTIONS.map(({ id, label, description, icon: Icon }) => {
              // At /settings (no section) Profile is shown on desktop, so it's marked there only
              const active = section ? id === section : id === "profile";
              const activeClass = active ? "md:bg-surface-2 md:text-fg" : "";
              return (
                <li key={id}>
                  <Link
                    to={`/settings/${id}`}
                    aria-current={section && active ? "page" : undefined}
                    className={`flex items-center gap-3 px-4 py-3.5 text-fg transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent md:rounded-lg md:px-3 md:py-2 md:text-fg-muted md:hover:text-fg ${activeClass}`}
                  >
                    <Icon className="size-4 shrink-0 text-fg-muted" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block type-label">{label}</span>
                      <span className="block truncate type-small text-fg-muted md:hidden">{description}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-fg-subtle md:hidden" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* The open section (on phones only once one is chosen) */}
        <div className={`min-w-0 flex-1 ${section ? "" : "max-md:hidden"}`}>
          <Link to="/settings" className="mb-5 inline-flex items-center gap-1 rounded-sm type-label text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent md:hidden">
            <ChevronLeft className="size-4" aria-hidden="true" />
            All settings
          </Link>
          <Component key={shown.id} />
        </div>
      </div>
    </Page>
  );
}
