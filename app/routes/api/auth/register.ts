import type { ActionFunctionArgs } from "react-router";
import { createUser } from "../../../services/user.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const formData = await request.formData();
    const email = formData.get("email") as string | null;
    const username = formData.get("username") as string;
    const pin = formData.get("pin") as string;
    const name = formData.get("name") as string;

    if (!username || !pin || !name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(JSON.stringify({ error: "Invalid email format" }), { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    const pinRegex = /^(\d{4}|\d{6})$/;
    if (!pinRegex.test(pin)) {
      return new Response(JSON.stringify({ error: "PIN must be 4 or 6 digits" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const user = await createUser({ email: email ?? undefined, username, pin, name });
    
    return new Response(JSON.stringify({
      message: "User created successfully",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        createdAt: user.createdAt,
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return new Response(JSON.stringify({ error: "Email or Username already exists" }), { 
        status: 409,
        headers: { "Content-Type": "application/json" }
      });
    }
    console.error("Registration error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}