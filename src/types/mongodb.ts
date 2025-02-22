import { Collection } from "mongodb";

export interface Collections {
  cars: Collection;
  images: Collection;
  vectors: Collection;
}
