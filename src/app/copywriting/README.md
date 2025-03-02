# Copywriting Studio

The Copywriting Studio is a feature of the Motive Archive Manager that allows users to generate high-quality content for articles and email marketing campaigns using AI assistance.

## Features

### Article Generator

- **AI-Generated Instructions**: Get detailed instructions for article writing based on a prompt
- **Structured Outlines**: Auto-generate outline sections for your article
- **Outline Modification**: Refine the article structure with AI assistance
- **Section-by-Section Content Generation**: Generate content following the established outline

### Email Marketing

- **Campaign Planning**: Generate structured email campaigns based on your brief
- **Email Type Templates**: Support for newsletters, promotions, announcements, and follow-ups
- **Subject Line Generation**: AI-generated subject lines optimized for engagement
- **SendGrid Integration**: Send test emails or campaigns directly through SendGrid

## Technical Overview

### Components

- `page.tsx`: Main Copywriting Studio page with tabbed interface
- `components/ArticleGenerator.tsx`: UI for article creation workflow
- `components/EmailMarketing.tsx`: UI for email marketing campaign creation

### API Endpoints

#### Article APIs

- `/api/copywriting/article/generate-instructions`: Creates article instructions and outline
- `/api/copywriting/article/modify-outline`: Refines article outline based on user input
- `/api/copywriting/article/generate-content`: Generates content for a specific article section

#### Email APIs

- `/api/copywriting/email/generate-instructions`: Creates email campaign instructions and structure
- `/api/copywriting/email/modify-outline`: Refines email outline based on user input
- `/api/copywriting/email/generate-content`: Generates content for a specific email section
- `/api/copywriting/email/send`: Sends emails via SendGrid API

## Environment Setup

The feature requires the following environment variables:

```
OPENAI_API_KEY=your_openai_api_key
SENDGRID_API_KEY=your_sendgrid_api_key
```

## Usage Notes

1. Start by entering a brief prompt describing your article or email campaign
2. Review and modify the AI-generated instructions and outline
3. Generate content section by section, following the outline
4. For emails, configure sending options and test before sending campaigns
