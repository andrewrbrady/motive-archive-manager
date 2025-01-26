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
              return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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
