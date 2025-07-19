import Link from "next/link";
import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";
import { BaseList } from "~/app/_components/BaseList";

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <main className="min-h-screen bg-gray-100 text-gray-900 px-8 py-6">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Airtable Clone</h1>

          {session ? (
            <div className="flex items-center gap-4">
              <span className="text-sm">Hi, {session.user?.name}</span>
              <Link
                href="/api/auth/signout"
                className="text-sm text-blue-600 hover:underline"
              >
                Sign out
              </Link>
            </div>
          ) : (
            <Link
              href="/api/auth/signin"
              className="text-sm text-blue-600 hover:underline"
            >
              Sign in
            </Link>
          )}
        </header>

        {session?.user ? (
          <BaseList />
        ) : (
          <p className="text-gray-600">Please sign in to access your workspace.</p>
        )}
      </main>
    </HydrateClient>
  );
}
