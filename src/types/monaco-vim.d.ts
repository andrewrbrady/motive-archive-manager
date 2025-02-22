declare module "monaco-vim" {
  import * as monaco from "monaco-editor";

  export interface VimMode {
    dispose: () => void;
  }

  export function initVimMode(
    editor: monaco.editor.IStandaloneCodeEditor,
    statusElm?: HTMLElement
  ): VimMode;
}
