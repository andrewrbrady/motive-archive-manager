export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background py-2">
      <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
        404 - Page Not Found
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        The page you are looking for does not exist.
      </p>
    </div>
  );
}
