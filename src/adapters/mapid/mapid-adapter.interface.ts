import type {
  MapidLocationQuery,
  MapidMenuGoRecord,
  MapidPropertiGoRecord,
  MapidStrukGoRecord,
} from "../../validators/mapid.validators.js";

export interface MapidAdapter {
  getStrukGo(query: MapidLocationQuery): Promise<MapidStrukGoRecord[]>;
  getMenuGo(query: MapidLocationQuery): Promise<MapidMenuGoRecord[]>;
  getPropertiGo(query: MapidLocationQuery): Promise<MapidPropertiGoRecord[]>;
}
