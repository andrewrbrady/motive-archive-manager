import { Collection, Document } from "mongodb";

export interface Collections {
  cars: Collection;
  images: Collection;
  vectors: Collection;
}

export interface MongoAddFieldsStage {
  $addFields: {
    [key: string]: any;
  };
}

export interface MongoProjectStage {
  $project: {
    [key: string]: any;
  };
}

export interface MongoMatchStage {
  $match: {
    [key: string]: any;
  };
}

export interface MongoLookupStage {
  $lookup: {
    from: string;
    let?: { [key: string]: any };
    pipeline?: any[];
    as: string;
  };
}

export interface MongoSortStage {
  $sort: {
    [key: string]: 1 | -1;
  };
}

export interface MongoSkipStage {
  $skip: number;
}

export interface MongoLimitStage {
  $limit: number;
}

export type MongoPipelineStage =
  | MongoAddFieldsStage
  | MongoProjectStage
  | MongoMatchStage
  | MongoLookupStage
  | MongoSortStage
  | MongoSkipStage
  | MongoLimitStage;

export interface MongoDocument extends Document {
  [key: string]: any;
}
