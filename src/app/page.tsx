import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">Unsub</h1>
      <p className="text-lg text-gray-600 mb-8">
        Find and unsubscribe from unwanted emails
      </p>
      <Link
        href="/api/auth/signin"
        className="rounded-lg bg-black px-6 py-3 text-white hover:bg-gray-800"
      >
        Get Started
      </Link>
    </main>
  );
}
