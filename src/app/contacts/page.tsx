import { Metadata } from "next";
import ContactsPageClient from "./ContactsPageClient";

export const metadata: Metadata = {
  title: "Contacts | Motive Archive Manager",
  description: "View and search contacts",
};

export default function ContactsPage() {
  return <ContactsPageClient />;
}
