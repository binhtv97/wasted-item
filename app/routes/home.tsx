export default function Home() {
  return (
    <p id="index-page">
      This is a demo for React Router.
      <br />
      Check out{" "}
      <a href="https://reactrouter.com">the docs at reactrouter.com</a>.
    </p>
  );
}
import type { Route } from "./+types/home";
import { redirect } from "react-router";

export async function loader({}: Route.LoaderArgs) {
  if (process.env.IS_REQUIRED_LOGIN === "true") {
    return redirect("/login-pin");
  }
  return redirect("/process");
}
