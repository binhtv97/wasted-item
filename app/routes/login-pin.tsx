import type { Route } from "./+types/login-pin";
import { useState, useRef } from "react";
import { useNavigate } from "react-router";

export async function loader({}: Route.LoaderArgs) {
  const required = process.env.IS_REQUIRED_LOGIN === "true";
  const count = Number(process.env.NUMBER_OF_PIN || 4);
  const normalized = Number.isFinite(count) && (count === 4 || count === 6) ? count : 4;
  return { required, count: normalized };
}

export default function LoginPinPage({ loaderData }: Route.ComponentProps) {
  const { count } = loaderData as { required: boolean; count: number };
  const [digits, setDigits] = useState<string[]>(Array(count).fill(""));
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const inputsRef = useRef<HTMLInputElement[]>([]);
  const navigate = useNavigate();

  const setInputRef = (el: HTMLInputElement | null, idx: number) => {
    if (el) inputsRef.current[idx] = el;
  };

  const handleChange = (idx: number, value: string) => {
    const v = value.replace(/\D/g, "").slice(0, 1);
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
    if (v && idx < count - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowRight" && idx < count - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const username = new FormData(form).get("username") as string;
    const pin = digits.join("");
    if (!username || pin.length !== count) {
      setMessage(`Enter username and ${count}-digit PIN`);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: new URLSearchParams({ username, pin }),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Login failed");
        return;
      }
      navigate("/process");
    } catch (err) {
      setMessage("Network error");
    }
    finally {
      setLoading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, count);
    if (pasted) {
      const next = pasted.split("");
      setDigits([...next, ...Array(count - next.length).fill("")].slice(0, count));
      const focusIdx = Math.min(next.length, count - 1);
      inputsRef.current[focusIdx]?.focus();
      e.preventDefault();
    }
  };

  const canSubmit = digits.join("").length === count;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-lg bg-white rounded-2xl shadow p-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Enter PIN</h1>
        <p className="mt-1 text-sm text-gray-500">Type your username and PIN</p>
        <form onSubmit={handleSubmit} autoComplete="off" className="mt-4 space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter username"
            />
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {Array.from({ length: count }).map((_, idx) => (
              <input
                key={idx}
                ref={(el) => setInputRef(el, idx)}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digits[idx]}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg border border-gray-300 text-center text-xl sm:text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-full rounded-lg bg-blue-600 text-white py-2.5 font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
          {message && <p className="text-center text-sm text-red-600">{message}</p>}
        </form>
      </div>
    </div>
  );
}