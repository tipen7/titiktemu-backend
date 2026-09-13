import {
  computeIsochrone,
  type IsochroneComputation,
} from "../repositories/isochrone.repository.js";
import type { IsochroneQuery } from "../validators/isochrone.validators.js";

export interface IsochroneResult extends IsochroneComputation {
  origin: { lat: number; lng: number };
  maxDistanceMeters: number;
}

export async function getIsochrone(
  input: IsochroneQuery,
): Promise<IsochroneResult | null> {
  const result = await computeIsochrone(
    input.lat,
    input.lng,
    input.maxDistanceMeters,
  );
  if (!result) return null;

  return {
    origin: { lat: input.lat, lng: input.lng },
    maxDistanceMeters: input.maxDistanceMeters,
    ...result,
  };
}
