import * as monaco from "monaco-editor";

export interface VimMode {
  dispose: () => void;
}

export interface MonacoVimType {
  initVimMode: (
    editor: monaco.editor.IStandaloneCodeEditor,
    statusBarElement: HTMLElement
  ) => VimMode;
}

declare global {
  interface Window {
    MonacoVim: MonacoVimType;
  }
}

declare module "monaco-vim" {
  export function initVimMode(
    editor: monaco.editor.IStandaloneCodeEditor,
    statusBarElement: HTMLElement
  ): { dispose: () => void };
}

export function initVimMode(
  editor: monaco.editor.IStandaloneCodeEditor,
  statusBarElement: HTMLElement
): VimMode;
