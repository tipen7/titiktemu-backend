import {
  type MapidMenuGoRecord,
  type MapidPropertiGoRecord,
  type MapidStrukGoRecord,
  mapidMenuGoRecordSchema,
  mapidPropertiGoRecordSchema,
  mapidStrukGoRecordSchema,
} from "../../validators/mapid.validators.js";
import type { MapidAdapter } from "./mapid-adapter.interface.js";

const strukGoFixtures: MapidStrukGoRecord[] = [
  mapidStrukGoRecordSchema.parse({
    id: "struk-001",
    merchantName: "Warung Bu Sari",
    category: "food_and_beverage",
    transactionCount: 412,
    averageTransactionValue: 18500,
    location: { lat: -6.2, lng: 106.816666 },
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
  }),
];

const menuGoFixtures: MapidMenuGoRecord[] = [
  mapidMenuGoRecordSchema.parse({
    id: "menu-001",
    merchantName: "Warung Bu Sari",
    menuCategory: "main_course",
    averagePrice: 15000,
    location: { lat: -6.2, lng: 106.816666 },
  }),
];

const propertiGoFixtures: MapidPropertiGoRecord[] = [
  mapidPropertiGoRecordSchema.parse({
    id: "properti-001",
    propertyType: "commercial",
    listingPrice: 2500000000,
    areaSqm: 45,
    location: { lat: -6.2, lng: 106.816666 },
    listedAt: "2026-07-15",
  }),
];

export class MockMapidAdapter implements MapidAdapter {
  async getStrukGo(): Promise<MapidStrukGoRecord[]> {
    return strukGoFixtures;
  }

  async getMenuGo(): Promise<MapidMenuGoRecord[]> {
    return menuGoFixtures;
  }

  async getPropertiGo(): Promise<MapidPropertiGoRecord[]> {
    return propertiGoFixtures;
  }
}
