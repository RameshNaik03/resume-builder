import baseToast from "react-hot-toast";

// react-hot-toast, with one change: a text message is its own id, so the same message is never
// shown twice at once (a repeated one replaces the one on screen, e.g. when React's dev mode
// loads a page twice and both loads fail). Pass an id to override. Use this module instead of
// importing react-hot-toast directly.
const withId =
  (show) =>
  (message, options = {}) =>
    show(message, { ...(typeof message === "string" && { id: message }), ...options });

const toast = Object.assign(withId(baseToast), baseToast, {
  success: withId(baseToast.success),
  error: withId(baseToast.error),
  loading: withId(baseToast.loading),
});

export default toast;
