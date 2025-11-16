import type { LoaderFunctionArgs } from "react-router";
import { getUserById } from "../../../services/user.server";

// GET /api/users/profile - Get current user profile
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // For now, we'll use a mock user ID. In a real app, you'd get this from session/JWT
    const userId = 1; // Mock user ID

    const user = await getUserById(userId);

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ user }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
