import { Component } from "react";

// Shows a message instead of a blank page when a page crashes while rendering, or when its
// code can't be downloaded (pages are loaded when opened, see App.jsx: after a new deploy or
// on a bad connection that download can fail). App.jsx gives it a new key on every page
// change, so moving to another page clears the error.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Page crashed:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    // A failed download of a page's code ("Failed to fetch dynamically imported module", etc.)
    const isLoadError = /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(this.state.error.message ?? "");
    return (
      <div className="flex items-center justify-center px-4 py-24" role="alert">
        <div className="max-w-md text-center">
          <h1 className="type-h1 text-fg">{isLoadError ? "This page couldn't be loaded" : "Something went wrong"}</h1>
          <p className="mt-3 type-body text-fg-muted">
            {isLoadError
              ? "Check your connection and reload. If the app was just updated, reloading gets the new version."
              : "An unexpected error stopped this page. Your saved resumes are safe; reload to try again."}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => window.location.reload()} className="btn-primary">
              Reload the page
            </button>
            <a href="/" className="btn-secondary">
              Back to home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
