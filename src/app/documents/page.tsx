// app/documents/page.tsx
import DocumentsClient from "./DocumentsClient";
import { headers } from "next/headers";

async function getDocuments(page = 1, limit = 10) {
  const headersList = await headers();
  const domain = headersList.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";

  const res = await fetch(
    `${protocol}://${domain}/api/documents?page=${page}&limit=${limit}`,
    { cache: "no-store" }
  );

  if (!res.ok) throw new Error("Failed to fetch receipts");
  return res.json();
}

export default async function DocumentsPage(props: any) {
  const searchParams = props.searchParams || {};
  const page = Number(searchParams?.page) || 1;
  const limit = Number(searchParams?.limit) || 10;
  const { documents } = await getDocuments(page, limit);

  return <DocumentsClient carId="all" initialDocuments={documents} />;
}
