import type { ActionFunctionArgs } from "react-router";
import { validateUser } from "../../../services/user.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const formData = await request.formData();
    const username = formData.get("username") as string;
    const pin = formData.get("pin") as string;

    if (!username || !pin) {
      return new Response(
        JSON.stringify({ error: "Missing username or PIN" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const user = await validateUser(username, pin);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid username or PIN" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // In a real application, you would create a session/JWT here
    // For now, we'll just return the user data (excluding password)
    return new Response(
      JSON.stringify({
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
