import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          // Keep the group's own packages only (otherwise React, which tiptap uses, is pulled
          // in too and every page has to load the group)
          includeDependenciesRecursively: false,
          groups: [
            // The rich text editor (tiptap + ProseMirror) is only used by the editor page. In its
            // own file, it's cached separately and the editor's chunk stays small.
            { name: 'rich-text', test: /node_modules[\\/](@tiptap|prosemirror-|orderedmap|rope-sequence|w3c-keyname|linkifyjs)/ },
          ],
        },
      },
    },
  },
})
