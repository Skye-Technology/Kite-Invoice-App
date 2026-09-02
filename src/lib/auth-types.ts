import type { DefaultSession } from "next-auth";

// next-auth v5's `auth()` return type resolves Session from "@auth/core/types" (it re-exports
// the type but doesn't declare its own interface there), so augmentation must target that
// module directly — augmenting "next-auth" alone has no effect on `auth()`'s inferred type.
declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
