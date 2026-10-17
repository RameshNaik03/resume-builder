import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axios";
import getErrorMessage from "../utils/getErrorMessage";

const AUTOSAVE_DELAY = 2000; // Save 2 seconds after the last change

// Loads one resume, keeps it in state, and saves changes back to the server.
// status is one of: "saved" | "unsaved" | "saving" | "error"
export default function useResume(id) {
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [status, setStatus] = useState("saved");

  // Refs hold values that save() needs without causing re-renders
  const resumeRef = useRef(null); // Always the latest resume
  const versionRef = useRef(0); // Goes up by 1 on every change
  const savedVersionRef = useRef(0); // The version that was last saved
  const isSavingRef = useRef(false);
  const saveAgainRef = useRef(false); // A save was requested while another was running

  useEffect(() => {
    resumeRef.current = resume;
  }, [resume]);

  // 1. Load the resume when the page opens (or the id changes)
  useEffect(() => {
    let ignore = false; // Stops a slow old request from overwriting newer state

    const loadResume = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { data } = await api.get(`/resumes/${id}`);
        if (!ignore) {
          setResume(data);
          setStatus("saved");
        }
      } catch (error) {
        if (!ignore) {
          setLoadError(
            error.response?.status === 404
              ? "This resume doesn't exist or may have been deleted."
              : getErrorMessage(error)
          );
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadResume();
    return () => {
      ignore = true;
    };
  }, [id]);

  // 2. Update part of the resume, e.g. updateResume({ summary: "..." })
  const updateResume = useCallback((changes) => {
    setResume((current) => ({ ...current, ...changes }));
    versionRef.current += 1;
    setStatus("unsaved");
  }, []);

  // 3. Send the latest resume to the server
  const save = useCallback(async () => {
    // Only one save at a time; if one is running, save again when it finishes
    if (isSavingRef.current) {
      saveAgainRef.current = true;
      return;
    }

    isSavingRef.current = true;

    try {
      // Repeat if another save was requested while this one was running
      do {
        saveAgainRef.current = false;
        const versionBeingSaved = versionRef.current;
        setStatus("saving");

        await api.put(`/resumes/${id}`, resumeRef.current);
        savedVersionRef.current = versionBeingSaved;

        // If the user kept typing while we were saving, there are still unsaved changes
        setStatus(versionRef.current === versionBeingSaved ? "saved" : "unsaved");
      } while (saveAgainRef.current);
    } catch (error) {
      setStatus("error");
      toast.error(`Couldn't save: ${getErrorMessage(error)}`, { id: "save-error" });
    } finally {
      isSavingRef.current = false;
    }
  }, [id]);

  // 4. Autosave: every change restarts the 2-second timer
  useEffect(() => {
    if (status !== "unsaved") return;
    const timer = setTimeout(save, AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [resume, status, save]);

  // 5. Warn before closing or refreshing the tab with unsaved changes
  useEffect(() => {
    if (status === "saved") return;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = ""; // Needed by some browsers to show the warning
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [status]);

  // 6. Leaving the editor inside the app (e.g. a Navbar link) before autosave ran:
  // send the last changes in the background so nothing is lost
  useEffect(() => {
    return () => {
      if (versionRef.current !== savedVersionRef.current && resumeRef.current) {
        api.put(`/resumes/${id}`, resumeRef.current).catch(() => {});
      }
    };
  }, [id]);

  return { resume, loading, loadError, status, updateResume, save };
}
