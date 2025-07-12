import { notFound } from "next/navigation";
import { fetchModelById } from "@/lib/fetchModels";
import ModelDetailClient from "./ModelDetailClient";

interface ModelDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ModelDetailPage({
  params,
}: ModelDetailPageProps) {
  const { id } = await params;
  const model = await fetchModelById(id);

  if (!model) {
    notFound();
  }

  return <ModelDetailClient model={model} />;
}

export async function generateMetadata({ params }: ModelDetailPageProps) {
  const { id } = await params;
  const model = await fetchModelById(id);

  if (!model) {
    return {
      title: "Model Not Found",
    };
  }

  return {
    title: `${model.make} ${model.model} ${model.generation?.code || ""} - Vehicle Models`,
    description:
      model.description || `Details for ${model.make} ${model.model}`,
  };
}
