import mongoose from "mongoose";
import { dbConnect } from "@/lib/mongodb";

dbConnect().catch(console.error);

// Chat message interface
export interface IChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    model?: string;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
    toolCalls?: any[];
    attachments?: string[]; // OpenAI file IDs
  };
}

// Chat conversation document interface
export interface IChatConversationDocument extends mongoose.Document {
  _id: string;
  threadId?: string; // OpenAI thread ID for 30-day conversation state
  title: string;
  associatedWith: {
    type: "car" | "project";
    entityId: string; // Car ID or Project ID
  };
  participants: string[]; // User IDs
  messages: IChatMessage[];
  fileIds: string[]; // Associated OpenAI file IDs for context
  settings: {
    model: string;
    temperature?: number;
    maxTokens?: number;
    tools?: string[]; // e.g., ['web_search', 'file_search']
  };
  status: "active" | "archived" | "deleted";
  lastActivity: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Chat message schema
const chatMessageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
  role: {
    type: String,
    required: true,
    enum: ["user", "assistant", "system"],
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    model: String,
    usage: {
      promptTokens: Number,
      completionTokens: Number,
      totalTokens: Number,
    },
    toolCalls: [mongoose.Schema.Types.Mixed],
    attachments: [String], // OpenAI file IDs
  },
});

// Chat conversation schema
const chatConversationSchema = new mongoose.Schema<IChatConversationDocument>(
  {
    threadId: {
      type: String,
      index: true,
      sparse: true, // Allow null values
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    associatedWith: {
      type: {
        type: String,
        enum: ["car", "project"],
        required: true,
      },
      entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "associatedWith.type", // Dynamic reference
      },
    },
    participants: [
      {
        type: String,
        ref: "User",
      },
    ],
    messages: [chatMessageSchema],
    fileIds: [String], // OpenAI file IDs
    settings: {
      model: {
        type: String,
        default: "gpt-4o-mini",
      },
      temperature: {
        type: Number,
        min: 0,
        max: 2,
        default: 0.7,
      },
      maxTokens: {
        type: Number,
        min: 1,
        max: 4096,
        default: 1000,
      },
      tools: [
        {
          type: String,
          enum: ["web_search", "file_search", "code_interpreter"],
        },
      ],
    },
    status: {
      type: String,
      enum: ["active", "archived", "deleted"],
      default: "active",
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: String,
      required: true,
      ref: "User",
    },
  },
  {
    collection: "chat_conversations",
    timestamps: true,
  }
);

// Indexes for performance
chatConversationSchema.index({ threadId: 1 });
chatConversationSchema.index({
  "associatedWith.type": 1,
  "associatedWith.entityId": 1,
});
chatConversationSchema.index({ participants: 1 });
chatConversationSchema.index({ status: 1 });
chatConversationSchema.index({ lastActivity: -1 });
chatConversationSchema.index({ createdBy: 1 });
chatConversationSchema.index({ createdAt: -1 });

// Pre-save middleware to update lastActivity
chatConversationSchema.pre("save", function (next) {
  if (this.isModified("messages")) {
    this.lastActivity = new Date();
  }
  next();
});

// Create and export the ChatConversation model
export const ChatConversation = (mongoose.models.ChatConversation ||
  mongoose.model<IChatConversationDocument>(
    "ChatConversation",
    chatConversationSchema
  )) as mongoose.Model<IChatConversationDocument>;

export default ChatConversation;
