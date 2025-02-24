import { ObjectId } from "mongodb";
import {
  APIResponse,
  PaginatedResponse,
  RouteHandler,
  RouteParamsWithId,
} from "../api";
import { ModelType } from "../models";

/**
 * Article stage types
 */
export type ArticleStage = "planning" | "drafting" | "polishing";

/**
 * Article stage data
 */
export interface ArticleStageData {
  stage: ArticleStage;
  content: string;
  timestamp: Date;
}

/**
 * MongoDB article metadata document type
 */
export interface MongoDBArticleMetadata {
  _id: ObjectId;
  carId: ObjectId;
  model: ModelType;
  stages: ArticleStageData[];
  currentStage: ArticleStage;
  createdAt: Date;
  updatedAt: Date;
  isComplete: boolean;
  sessionId: string;
}

/**
 * MongoDB saved article document type
 */
export interface MongoDBSavedArticle {
  _id: ObjectId;
  content: string;
  stage: ArticleStage;
  metadata: {
    carId: ObjectId;
    sessionId: string;
    model: ModelType;
    focus?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Standardized article metadata response format
 */
export interface StandardizedArticleMetadata {
  _id: string;
  carId: string;
  model: ModelType;
  stages: Array<Omit<ArticleStageData, "timestamp"> & { timestamp: string }>;
  currentStage: ArticleStage;
  createdAt: string;
  updatedAt: string;
  isComplete: boolean;
  sessionId: string;
}

/**
 * Standardized saved article response format
 */
export interface StandardizedSavedArticle {
  _id: string;
  content: string;
  stage: ArticleStage;
  metadata: {
    carId: string;
    sessionId: string;
    model: ModelType;
    focus?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Article generation request body
 */
export interface GenerateArticleBody {
  model: ModelType;
  stage: ArticleStage;
  context?: string;
  focus?: string;
}

/**
 * Article save request body
 */
export interface SaveArticleBody {
  content: string;
  stage: ArticleStage;
  sessionId: string;
}

/**
 * Response types
 */
export type ArticleMetadataResponse = APIResponse<StandardizedArticleMetadata>;
export type SavedArticlesResponse = APIResponse<StandardizedSavedArticle[]>;
export type ArticleGenerationResponse = APIResponse<{
  content: string;
  stage: ArticleStage;
}>;

/**
 * Route handlers
 */
export type GetArticleHandler = RouteHandler<
  ArticleMetadataResponse,
  RouteParamsWithId
>;

export type GenerateArticleHandler = RouteHandler<
  ArticleGenerationResponse,
  RouteParamsWithId
>;

export type SaveArticleHandler = RouteHandler<
  APIResponse<{ success: boolean; id: string }>,
  RouteParamsWithId
>;

export type GetSavedArticlesHandler = RouteHandler<
  SavedArticlesResponse,
  RouteParamsWithId
>;

export type SaveNewArticleHandler = RouteHandler<
  APIResponse<StandardizedSavedArticle>,
  RouteParamsWithId
>;

export type DeleteSavedArticleHandler = RouteHandler<
  APIResponse<{ success: boolean }>,
  RouteParamsWithId & { sessionId: string }
>;
