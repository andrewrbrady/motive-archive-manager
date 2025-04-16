import * as monaco from "monaco-editor";

declare module "monaco-vim" {
  export function initVimMode(
    editor: monaco.editor.IStandaloneCodeEditor,
    statusBarElement: HTMLElement
  ): { dispose: () => void };
}
