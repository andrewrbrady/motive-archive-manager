export interface ShotTemplate {
  title: string;
  description: string;
  angle?: string;
  lighting?: string;
  notes?: string;
  thumbnail?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  shots: ShotTemplate[];
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShotListTemplatesTabProps {
  shouldCreateTemplate?: boolean;
}

export interface ImageBrowserProps {
  onSelectImage: (imageUrl: string) => void;
}

export interface TemplateHeaderProps {
  onCreateNew: () => void;
  isCreating: boolean;
}

export interface TemplateGridProps {
  templates: Template[];
  selectedTemplate: Template | null;
  onTemplateSelect: (template: Template) => void;
  onEdit: (template: Template) => void;
  onDelete: (templateId: string) => void;
  onDuplicate: (template: Template) => void;
  isLoading: boolean;
}

export interface TemplateViewerProps {
  template: Template;
  onEdit: () => void;
}

export interface TemplateEditorProps {
  template: Template | null;
  isCreating: boolean;
  onSave: (data: Partial<Template>) => void;
  onCancel: () => void;
}

export interface ShotManagerProps {
  shots: ShotTemplate[];
  onAddShot: () => void;
  onRemoveShot: (index: number) => void;
  onUpdateShot: (index: number, shot: ShotTemplate) => void;
  isEditing: boolean;
}

export interface FileUploadZoneProps {
  onFilesUploaded: (files: File[]) => void;
  multiple?: boolean;
  accept?: string;
  className?: string;
}
