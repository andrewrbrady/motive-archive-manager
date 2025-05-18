import React from "react";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { format } from "date-fns";

interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

async function getReceipt(id: string) {
  const client = await clientPromise;
  if (!client) {
    throw new Error("Failed to connect to database");
  }
  const db = client.db("motive_archive");

  const receipt = await db
    .collection("receipts")
    .findOne({ _id: new ObjectId(id) });

  if (!receipt) {
    throw new Error("Receipt not found");
  }

  return receipt;
}

export default async function ReceiptPage(props: any) {
  const receipt = await getReceipt(props.params.id);

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">
          Receipt - {receipt.merchant.name}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Merchant Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="font-medium">Name:</div>
                <div>{receipt.merchant.name}</div>
                {receipt.merchant.address && (
                  <>
                    <div className="font-medium">Address:</div>
                    <div>{receipt.merchant.address}</div>
                  </>
                )}
                {receipt.merchant.phone && (
                  <>
                    <div className="font-medium">Phone:</div>
                    <div>{receipt.merchant.phone}</div>
                  </>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold">Transaction Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="font-medium">Date:</div>
                <div>
                  {format(new Date(receipt.transaction.date), "MMMM d, yyyy")}
                </div>
                {receipt.transaction.time && (
                  <>
                    <div className="font-medium">Time:</div>
                    <div>{receipt.transaction.time}</div>
                  </>
                )}
                <div className="font-medium">Total:</div>
                <div>${receipt.transaction.total.toFixed(2)}</div>
                {receipt.transaction.payment_method && (
                  <>
                    <div className="font-medium">Payment Method:</div>
                    <div>{receipt.transaction.payment_method}</div>
                  </>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">
                Items ({receipt.item_count})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-[hsl(var(--foreground))] uppercase bg-[hsl(var(--background))]">
                    <tr>
                      <th className="px-4 py-2 text-left">Item</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-right">Price</th>
                      <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipt.items.map((item: ReceiptItem, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="px-4 py-2">{item.name}</td>
                        <td className="px-4 py-2 text-right">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2 text-right">
                          ${item.unit_price.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right">
                          ${item.total_price.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
