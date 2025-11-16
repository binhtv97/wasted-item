import type { LoaderFunctionArgs } from "react-router";

export async function loader({}: LoaderFunctionArgs) {
  return new Response("{}", {
    headers: { "Content-Type": "application/json" },
  });
}