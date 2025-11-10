export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          HBTU Admin Dashboard
        </h1>
        <p className="text-gray-600 mb-8">
          Manage your college study app content
        </p>
        <a
          href="/login"
          className="bg-primary-500 text-white px-6 py-3 rounded-lg hover:bg-primary-600 transition"
        >
          Login to Dashboard
        </a>
      </div>
    </div>
  );
}
