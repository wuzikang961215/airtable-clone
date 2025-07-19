import { fetchRequestHandler, type FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { env } from "~/env";

export const dynamic = "force-dynamic";

const createContext = async (opts: FetchCreateContextFnOptions) => {
  return createTRPCContext({
    headers: opts.req.headers,
  });
};

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext, // ✅ type-safe
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
