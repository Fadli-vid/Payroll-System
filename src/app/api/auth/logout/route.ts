import { successResponse } from "@/src/utils/api-response";
import { COOKIE_NAME } from "@/src/lib/auth";

export async function POST() {
  const response = successResponse({ loggedOut: true }, 200);

  // Clear HttpOnly Cookie
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  return response;
}
