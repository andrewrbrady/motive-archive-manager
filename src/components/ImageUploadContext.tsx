import { useState } from "react";

interface ImageUploadContextProps {
  onContextChange: (context: string) => void;
  defaultValue?: string;
}

export default function ImageUploadContext({
  onContextChange,
  defaultValue = "",
}: ImageUploadContextProps) {
  const [context, setContext] = useState(defaultValue);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setContext(newValue);
    onContextChange(newValue);
  };

  return (
    <div className="w-full space-y-2">
      <label
        htmlFor="imageContext"
        className="block text-sm font-medium text-gray-700"
      >
        Additional Context
      </label>
      <textarea
        id="imageContext"
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
        rows={3}
        placeholder="Add any additional details about the vehicle, location, or specific features you'd like the AI to focus on..."
        value={context}
        onChange={handleChange}
      />
      <p className="text-sm text-gray-500">
        This context will help the AI better understand and analyze the images.
      </p>
    </div>
  );
}
