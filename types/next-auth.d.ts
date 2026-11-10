// Tell TypeScript that our sessions carry the user's id and role.
import type { Role } from "@/lib/roles";

declare module "next-auth" {
  interface Session {
    user: { id: string; name: string; email: string; role: Role };
  }
  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
