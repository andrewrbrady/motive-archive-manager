import * as monaco from "monaco-editor";

declare module "monaco-vim" {
  export function initVimMode(
    editor: monaco.editor.IStandaloneCodeEditor,
    statusBarElement: HTMLElement
  ): { dispose: () => void };
}

declare module "react-syntax-highlighter/dist/cjs/styles/prism" {
  const oneDark: any;
  export { oneDark };
}

declare module "@monaco-editor/react" {
  import * as monaco from "monaco-editor";
  import React from "react";

  export interface EditorProps {
    height?: string | number;
    width?: string | number;
    value?: string;
    defaultValue?: string;
    language?: string;
    defaultLanguage?: string;
    theme?: string | any;
    options?: monaco.editor.IStandaloneEditorConstructionOptions;
    overrideServices?: monaco.editor.IEditorOverrideServices;
    onChange?: (
      value: string | undefined,
      event: monaco.editor.IModelContentChangedEvent
    ) => void;
    onMount?: OnMount;
    beforeMount?: (monaco: typeof monaco) => void;
    onValidate?: (markers: monaco.editor.IMarker[]) => void;
    className?: string;
    loading?: React.ReactNode;
    saveViewState?: boolean;
    keepCurrentModel?: boolean;
    line?: number;
    autoIndent?: boolean;
  }

  export type OnMount = (
    editor: monaco.editor.IStandaloneCodeEditor,
    monaco: typeof monaco
  ) => void;

  export default function Editor(props: EditorProps): React.ReactElement;
}
