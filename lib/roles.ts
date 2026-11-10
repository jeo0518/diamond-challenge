// Small role helpers shared by the server, the middleware, and the UI.
// Kept free of database/Node imports so the middleware can use it too.

export type Role = "CUSTOMER" | "OWNER";

/** Where each role lands after logging in. */
export const HOME_FOR_ROLE: Record<Role, string> = {
  CUSTOMER: "/restaurants",
  OWNER: "/owner/dashboard",
};

/** Login page for each role. */
export const LOGIN_FOR_ROLE: Record<Role, string> = {
  CUSTOMER: "/login",
  OWNER: "/owner/login",
};
