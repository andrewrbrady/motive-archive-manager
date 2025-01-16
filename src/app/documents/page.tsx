// app/documents/page.tsx
import DocumentsClient from "./DocumentsClient";
import { headers } from "next/headers";

async function getDocuments(page = 1, limit = 10) {
  const headersList = headers();
  const domain = headersList.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";

  const res = await fetch(
    `${protocol}://${domain}/api/documents?page=${page}&limit=${limit}`,
    { cache: "no-store" }
  );

  if (!res.ok) throw new Error("Failed to fetch receipts");
  return res.json();
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const page = Number(searchParams?.page) || 1;
  const limit = Number(searchParams?.limit) || 10;
  const { documents, pagination } = await getDocuments(page, limit);

  return (
    <DocumentsClient
      initialDocuments={documents}
      initialPagination={pagination}
    />
  );
}
