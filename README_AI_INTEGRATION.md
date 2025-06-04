# OpenAI Integration for Motive Archive Manager

This document describes the OpenAI Responses API and Files API integration implemented for the Motive Archive Manager.

## 🎯 Overview

We've successfully integrated OpenAI's latest APIs to provide AI-powered chat assistance for both cars and projects. The integration follows your existing patterns for:

- **Database connections** using `getDatabase()` from `@/lib/mongodb`
- **Authentication** using Firebase middleware
- **Component architecture** with lazy loading and memoization
- **API structure** consistent with existing routes

## 📁 File Structure

### Core Files

```
src/
├── lib/
│   └── openai.ts                    # OpenAI client configuration
├── models/
│   ├── AIFile.ts                   # File management model
│   └── ChatConversation.ts         # Chat conversation model
├── hooks/
│   └── useChat.ts                  # React hook for streaming chat
├── components/
│   └── ai-chat/
│       ├── AIChatInterface.tsx     # Main chat UI component
│       └── AIChatTab.tsx          # Tab wrapper component
└── app/api/
    ├── ai-chat/
    │   └── route.ts               # Chat streaming endpoint
    └── ai-files/
        └── upload/
            └── route.ts           # File upload to OpenAI
```

### Updated Components

```
src/components/
├── cars/
│   └── CarTabs.tsx                # Added AI Assistant tab
└── projects/
    └── ProjectTabs.tsx            # Added AI Assistant tab
```

## 🚀 Features Implemented

### 1. AI Chat Interface

- **Streaming responses** from OpenAI using Server-Sent Events
- **Context-aware prompts** with car/project specific information
- **Conversation persistence** in MongoDB
- **Real-time UI updates** with loading states and error handling
- **Token usage tracking** for cost monitoring

### 2. File Management

- **Upload files to OpenAI** for context in conversations
- **File association** with cars and/or projects
- **Metadata tracking** (description, category, tags)
- **Database storage** of file references and associations

### 3. Tab Integration

- **CarTabs**: Added "AI Assistant" tab after Copywriter
- **ProjectTabs**: Added "AI Assistant" tab before Calendar
- **Lazy loading** to maintain performance
- **Proper memoization** to prevent unnecessary re-renders

## 🔧 Database Collections

### `chat_conversations`

```javascript
{
  _id: ObjectId,
  threadId: String,              // Optional: OpenAI thread ID for 30-day state
  title: String,                 // Generated conversation title
  associatedWith: {
    type: 'car' | 'project',
    entityId: ObjectId           // Car or Project ID
  },
  participants: [String],        // User IDs
  messages: [{
    id: String,
    role: 'user' | 'assistant' | 'system',
    content: String,
    timestamp: Date,
    metadata: {
      model: String,
      usage: { promptTokens, completionTokens, totalTokens },
      attachments: [String]      // OpenAI file IDs
    }
  }],
  fileIds: [String],            // OpenAI file IDs for context
  settings: {
    model: String,
    temperature: Number,
    maxTokens: Number,
    tools: [String]
  },
  status: String,
  lastActivity: Date,
  createdBy: String,
  createdAt: Date,
  updatedAt: Date
}
```

### `ai_files`

```javascript
{
  _id: ObjectId,
  openaiFileId: String,         // OpenAI file ID
  filename: String,             // Generated filename
  originalName: String,         // User's original filename
  purpose: String,              // 'assistants:file_search'
  size: Number,
  mimeType: String,
  uploadedBy: String,
  associatedWith: {
    type: 'car' | 'project' | 'both',
    carIds: [ObjectId],
    projectIds: [ObjectId]
  },
  metadata: {
    description: String,
    tags: [String],
    category: String
  },
  status: 'uploading' | 'processed' | 'error' | 'deleted',
  errorMessage: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔗 API Endpoints

### `/api/ai-chat` (POST)

**Streaming chat endpoint with OpenAI integration**

**Request Body:**

```javascript
{
  messages: Array<{role, content}>,
  conversationId?: string,
  entityType: 'car' | 'project',
  entityId: string,
  fileIds?: string[],
  settings?: {
    model?: string,
    temperature?: number,
    maxTokens?: number,
    tools?: string[]
  }
}
```

**Response:** Server-Sent Events stream with:

- `content` events: Streaming message content
- `complete` events: Final usage stats and conversation ID
- `error` events: Error messages

### `/api/ai-files/upload` (POST, GET)

**File upload to OpenAI and metadata management**

**POST FormData:**

- `file`: File to upload
- `entityType`: 'car' | 'project'
- `entityId`: Entity ID
- `description`: Optional description
- `category`: Optional category

**GET Query Params:**

- `entityType`: 'car' | 'project'
- `entityId`: Entity ID

## 💡 Usage Examples

### Basic Chat Usage

```typescript
// In a car detail page
import { AIChatTab } from '@/components/ai-chat/AIChatTab';

<AIChatTab
  entityType="car"
  entityId={carId}
  entityInfo={carData}
/>
```

### Using the Hook Directly

```typescript
import { useChat } from "@/hooks/useChat";

const { messages, isLoading, error, send, clearMessages } = useChat({
  entityType: "project",
  entityId: projectId,
  fileIds: ["file-123", "file-456"],
  settings: {
    model: "gpt-4o-mini",
    temperature: 0.7,
  },
});

// Send a message
await send("What is the status of this project?");
```

## 🎨 UI Components

### AIChatInterface

**Modern chat interface with:**

- Real-time streaming responses
- Message history with timestamps
- File attachment indicators
- Token usage display
- Error handling with retry options
- Auto-scroll to new messages
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)

### Integration in Existing Tabs

- **CarTabs**: Positioned as 5th tab (after Copywriter, before Inspections)
- **ProjectTabs**: Positioned as 10th tab (after Copywriter, before Calendar)
- **Lazy loaded** to maintain performance
- **Context-aware titles** based on entity data

## 🔒 Security & Authentication

- **Firebase authentication** required for all endpoints
- **User isolation** - users can only access their conversations
- **Entity validation** - ensures user has access to car/project
- **File upload restrictions** - files associated only with user's entities
- **OpenAI API key** kept server-side only

## 🚀 Performance Features

- **Streaming responses** for real-time feedback
- **Lazy loading** of heavy chat components
- **Memoized components** to prevent unnecessary re-renders
- **Edge runtime** for faster API responses
- **Conversation caching** for faster subsequent interactions

## 🌟 Key Benefits

1. **Context-Aware**: AI knows about specific cars/projects
2. **File Integration**: Upload documents for AI to reference
3. **Conversation History**: Persistent chat sessions
4. **Streaming**: Real-time responses for better UX
5. **Performance**: Optimized for your existing architecture
6. **Scalable**: Ready for future OpenAI features

## 🔧 Configuration

### Environment Variables Required

```bash
OPENAI_API_KEY=your_openai_api_key
```

### Dependencies Already Available

- `openai`: ^4.78.1 ✅
- MongoDB connection ✅
- Firebase auth ✅
- Tailwind CSS ✅
- All UI components ✅

## 📈 Future Enhancements

1. **Assistants API Integration**: Replace basic chat with full Assistants API
2. **Function Calling**: Let AI interact with your data directly
3. **Image Analysis**: Analyze car photos in conversations
4. **Voice Interface**: Add speech-to-text for hands-free operation
5. **Advanced File Search**: Semantic search across uploaded documents

---

**Status**: ✅ Ready for testing
**Compatibility**: Follows existing Motive Archive patterns
**Database**: Uses your existing `getDatabase()` pattern
**Performance**: Optimized with lazy loading and memoization
