import { notFound } from "next/navigation";
import { HydrateClient } from "~/trpc/server";
import { db } from "~/server/db";
import { TableView } from "~/app/_components/table/TableView";

export default async function Page({
  params,
}: {
  params: Promise<{ baseId: string; tableId: string }>;
}) {
  const { baseId, tableId } = await params;

  const table = await db.table.findUnique({
    where: { id: tableId },
    select: { id: true, name: true, baseId: true },
  });

  if (!table || table.baseId !== baseId) {
    return notFound();
  }

  return (
    <HydrateClient>
      <main className="min-h-screen p-6 bg-white text-gray-900">
        <h1 className="text-2xl font-semibold mb-4">{table.name}</h1>
        <TableView 
          tableId={tableId} 
          activeViewId={null}
          onViewChange={() => {
            // No-op for this simple view
          }}
        />
      </main>
    </HydrateClient>
  );
}
