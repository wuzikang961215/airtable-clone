import Link from "next/link";
import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";

import { BaseList } from "~/app/_components/BaseList";

export default async function Home() {
  const session = await auth();

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-start bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white py-16">
        <div className="container flex flex-col items-center gap-6 px-4">
          <h1 className="text-4xl font-bold">
            Airtable Clone
          </h1>

          <p className="text-lg">
            {session ? `Logged in as ${session.user?.name}` : "Not signed in"}
          </p>

          <Link
            href={session ? "/api/auth/signout" : "/api/auth/signin"}
            className="rounded-full bg-white/10 px-6 py-2 text-white hover:bg-white/20 transition"
          >
            {session ? "Sign out" : "Sign in"}
          </Link>

          {session?.user && <BaseList />}
        </div>
      </main>
    </HydrateClient>
  );
}
