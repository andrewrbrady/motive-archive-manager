# Motive Archive Manager

A modern archive management system built with Next.js, featuring a powerful MDX editor with media support.

## Features

- Rich text editing with MDX support
- Real-time preview
- Media insertion capabilities
- Modern UI with dark mode support
- Responsive design
- Vercel Analytics integration for usage tracking
- Performance monitoring with Speed Insights

## Prerequisites

- Node.js 18.17.0 or later
- npm or yarn

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/yourusername/motive-archive-manager.git
cd motive-archive-manager
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Start the development server:

```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── MDXEditor.tsx
│   ├── MediaSelector.tsx
│   └── ui/
│       ├── button.tsx
│       ├── dialog.tsx
│       └── input.tsx
└── lib/
    └── utils.ts
```

## Built With

- [Next.js](https://nextjs.org/) - The React framework
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [Radix UI](https://www.radix-ui.com/) - UI primitives
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Vercel Analytics](https://vercel.com/analytics) - Usage analytics and insights
- [Vercel Speed Insights](https://vercel.com/docs/speed-insights) - Performance monitoring

## Analytics

This project includes Vercel Analytics and Speed Insights for tracking user interactions and performance metrics. The analytics are automatically enabled when deployed to Vercel and require no additional configuration.

### What's Tracked

- **Analytics**: Page views, user interactions, and custom events
- **Speed Insights**: Core Web Vitals, performance metrics, and loading times

### Privacy

All analytics data is processed in compliance with privacy regulations and Vercel's privacy policy. No personally identifiable information is collected without explicit consent.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
