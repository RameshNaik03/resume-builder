// Lets the unit tests (npm test) import the app's plain-JS modules as Vite does: relative imports
// without an extension ("./registry") resolve to the ".js" file. Loaded with node --import.
import { register } from "node:module";

register(
  `data:text/javascript,${encodeURIComponent(`
    export async function resolve(specifier, context, next) {
      try {
        return await next(specifier, context);
      } catch (error) {
        const relative = specifier.startsWith("./") || specifier.startsWith("../");
        if (error?.code !== "ERR_MODULE_NOT_FOUND" || !relative || /\\.[a-z]+$/i.test(specifier)) throw error;
        return next(specifier + ".js", context);
      }
    }
  `)}`
);
