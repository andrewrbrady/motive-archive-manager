description: Rules for AI model usage and configurations
pattern: ["src/app/api/**/*.ts", "src/lib/**/*.ts"]

When working with AI models in this project:

1. Model Selection:

   - Use `gpt-4o-mini` instead of `gpt-4-vision-preview`
   - For Anthropic APIs, use `claude-3-5-sonnet-20241022`

2. API Integration:
   - Always implement proper error handling
   - Use environment variables for API keys
   - Implement rate limiting where appropriate
