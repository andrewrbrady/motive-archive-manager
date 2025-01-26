export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            function getTheme() {
              const storedTheme = localStorage.getItem('theme');
              if (storedTheme) {
                return storedTheme;
              }
              return 'dark'; // Default to dark instead of checking system preference
            }

            const theme = getTheme();
            if (theme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          })();
        `,
      }}
    />
  );
}
