export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background py-2">
      <h1 className="text-4xl font-bold mb-4 text-[hsl(var(--foreground))] dark:text-[hsl(var(--foreground))]">
        404 - Page Not Found
      </h1>
      <p className="text-[hsl(var(--foreground-subtle))] dark:text-[hsl(var(--foreground-muted))]">
        The page you are looking for does not exist.
      </p>
    </div>
  );
}
