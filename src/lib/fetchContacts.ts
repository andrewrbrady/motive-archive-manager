import { getDatabase } from "@/lib/mongodb";
import { Contact } from "@/types/contact";

export async function fetchContacts() {
  try {
    const db = await getDatabase();

    const contacts = await db
      .collection<Contact>("contacts")
      .find({})
      .sort({ firstName: 1, lastName: 1 })
      .toArray();

    return contacts.map((contact) => ({
      ...contact,
      _id: contact._id.toString(),
    }));
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return [];
  }
}

export async function fetchActiveContacts() {
  try {
    const db = await getDatabase();

    const contacts = await db
      .collection<Contact>("contacts")
      .find({ status: "active" })
      .sort({ firstName: 1, lastName: 1 })
      .toArray();

    return contacts.map((contact) => ({
      ...contact,
      _id: contact._id.toString(),
    }));
  } catch (error) {
    console.error("Error fetching active contacts:", error);
    return [];
  }
}
