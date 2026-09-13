import { query } from "../db/index.js";
import type {
  MapidMenuGoRecord,
  MapidPropertiGoRecord,
  MapidStrukGoRecord,
} from "../validators/mapid.validators.js";

type MapidDataset = "struk_go" | "menu_go" | "properti_go";

interface MapidStagingBatch {
  strukGo: MapidStrukGoRecord[];
  menuGo: MapidMenuGoRecord[];
  propertiGo: MapidPropertiGoRecord[];
}

export async function insertMapidStagingRecords(
  jobId: string,
  batch: MapidStagingBatch,
): Promise<number> {
  const upserts = [
    ...batch.strukGo.map((record) =>
      upsertRecord(jobId, "struk_go", record.id, record, record.location),
    ),
    ...batch.menuGo.map((record) =>
      upsertRecord(jobId, "menu_go", record.id, record, record.location),
    ),
    ...batch.propertiGo.map((record) =>
      upsertRecord(jobId, "properti_go", record.id, record, record.location),
    ),
  ];
  await Promise.all(upserts);
  return upserts.length;
}

async function upsertRecord(
  jobId: string,
  dataset: MapidDataset,
  externalId: string,
  payload: unknown,
  location: { lat: number; lng: number },
): Promise<void> {
  await query(
    `INSERT INTO mapid_staging (job_id, dataset, external_id, payload, location)
     VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326))
     ON CONFLICT (dataset, external_id) DO UPDATE
       SET payload = EXCLUDED.payload,
           location = EXCLUDED.location,
           job_id = EXCLUDED.job_id,
           ingested_at = now()`,
    [
      jobId,
      dataset,
      externalId,
      JSON.stringify(payload),
      location.lng,
      location.lat,
    ],
  );
}
