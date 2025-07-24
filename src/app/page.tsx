import Link from "next/link";
import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";
import BaseList from "~/app/_components/BaseList";

export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    return (
      <HydrateClient>
        <main className="min-h-screen bg-gray-100 text-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Welcome to Airtable</h1>
            <p className="text-gray-600 mb-6">Please sign in to access your workspace.</p>
            <Link
              href="/api/auth/signin"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Sign in
            </Link>
          </div>
        </main>
      </HydrateClient>
    );
  }

  return (
    <HydrateClient>
      <BaseList />
    </HydrateClient>
  );
}
