import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Notes</h1>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="text-gray-600 hover:text-gray-900"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-bold mb-4">Simple Note Taking</h2>
        <p className="text-xl text-gray-600 mb-8">
          Create, edit, and share rich-text notes with ease.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/register"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 text-lg"
          >
            Login
          </Link>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-8 text-left">
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="font-semibold mb-2">Rich Text Editor</h3>
            <p className="text-gray-600 text-sm">
              Format your notes with headings, lists, code blocks, and more.
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="font-semibold mb-2">Public Sharing</h3>
            <p className="text-gray-600 text-sm">
              Share notes with anyone via a public link.
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="font-semibold mb-2">Fast & Simple</h3>
            <p className="text-gray-600 text-sm">
              Clean interface focused on writing.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
