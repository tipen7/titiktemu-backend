-- Mock seed data for 002_analytics_mock_schema.sql's tables. NOT real
-- survey/model output from titiktemu-analytics -- fabricated so this
-- repo's read-model endpoints (/api/zones, /api/zones/lookup,
-- /api/reallocation, /api/model-accuracy, /api/umkm*,
-- /api/dashboard-summary, /api/policy-recommendations, /api/chat) have
-- something to serve during local development. Safe to re-run (every
-- insert is ON CONFLICT DO NOTHING, or guarded for tables without a
-- natural unique key) and safe to delete this file entirely once
-- titiktemu-analytics is wired up for real.
--
-- 3 bahaya (ews_code 2) / 4 waspada (1) / 5 aman (0) = 12 grid cells,
-- across a few districts loosely along the MRT Lebak Bulus--Bundaran HI
-- corridor. grid_000_000 / grid_000_010 match the coordinates
-- src/routes/zones.test.ts already asserts against; grid_000_020 covers
-- the point used to first notice the missing-tables issue
-- (lat=-6.294994399825549, lng=106.82212829589844).

INSERT INTO spatial_grids (grid_id, district_name, kecamatan, geom)
SELECT grid_id, district_name, kecamatan,
       ST_Envelope(ST_Buffer(ST_Transform(ST_SetSRID(ST_MakePoint(lng, lat), 4326), 32748), 125))
FROM (
  VALUES
    ('grid_000_000', 'Senayan',          'Kebayoran Baru', -6.24397624167159::float8,  106.799125961985::float8),
    ('grid_000_001', 'Senayan',          'Kebayoran Baru', -6.2440,                    106.7995),
    ('grid_000_002', 'Senayan',          'Kebayoran Baru', -6.2450,                    106.8000),
    ('grid_000_003', 'Sisingamangaraja', 'Kebayoran Baru', -6.2300,                    106.7970),
    ('grid_000_004', 'Sisingamangaraja', 'Kebayoran Baru', -6.2280,                    106.7980),
    ('grid_000_005', 'Blok M',           'Kebayoran Baru', -6.2650,                    106.8050),
    ('grid_000_006', 'Blok M',           'Kebayoran Baru', -6.2680,                    106.8030),
    ('grid_000_010', 'Dukuh Atas',       'Setiabudi',      -6.22137185591368,          106.79904893291),
    ('grid_000_011', 'Dukuh Atas',       'Setiabudi',      -6.2200,                    106.7995),
    ('grid_000_012', 'Dukuh Atas',       'Setiabudi',      -6.2180,                    106.7980),
    ('grid_000_013', 'Sudirman',         'Setiabudi',      -6.2350,                    106.7900),
    ('grid_000_020', 'Cipete',           'Cilandak',       -6.294994399825549,         106.82212829589844)
) AS grid_input (grid_id, district_name, kecamatan, lat, lng)
ON CONFLICT (grid_id) DO NOTHING;

INSERT INTO gentrification_risk_scores (grid_id, ews_code, vulnerability_index, matching_score)
VALUES
  ('grid_000_000', 2, 0.82, 45.2),
  ('grid_000_001', 2, 0.79, 48.0),
  ('grid_000_002', 2, 0.75, 50.1),
  ('grid_000_003', 1, 0.55, 60.0),
  ('grid_000_004', 1, 0.52, 62.3),
  ('grid_000_005', 1, 0.58, 58.7),
  ('grid_000_006', 1, 0.60, 55.4),
  ('grid_000_010', 0, 0.21, 82.5),
  ('grid_000_011', 0, 0.18, 85.0),
  ('grid_000_012', 0, 0.15, 88.2),
  ('grid_000_013', 0, 0.25, 79.0),
  ('grid_000_020', 0, 0.30, 75.0)
ON CONFLICT (grid_id) DO NOTHING;

-- Derived from the two tables above, so it can't drift from them.
INSERT INTO spatial_grids_geojson (grid_id, feature)
SELECT
  g.grid_id,
  jsonb_build_object(
    'type', 'Feature',
    'geometry', ST_AsGeoJSON(ST_Transform(g.geom, 4326))::jsonb,
    'properties', jsonb_build_object(
      'grid_id', g.grid_id,
      'district_name', g.district_name,
      'kecamatan', g.kecamatan,
      'poi_count', null,
      'ews_code', r.ews_code,
      'vulnerability_index', r.vulnerability_index,
      'matching_score', r.matching_score
    )
  )
FROM spatial_grids g
JOIN gentrification_risk_scores r ON r.grid_id = g.grid_id
ON CONFLICT (grid_id) DO NOTHING;

INSERT INTO policy_recommendations (grid_id, narrative, recommendation_type, generated_at)
VALUES
  ('grid_000_000', 'Kawasan Senayan menunjukkan indeks kerentanan tinggi akibat kenaikan sewa yang signifikan. Direkomendasikan program subsidi sewa sementara bagi UMKM eksisting dan moratorium alih fungsi lahan komersial baru.', 'mitigasi', now() - interval '3 days'),
  ('grid_000_001', 'Tekanan gentrifikasi di area ini didorong oleh kedekatan dengan simpul transit utama. Realokasi UMKM terdampak ke kawasan Dukuh Atas yang masih memiliki kapasitas dan skor kecocokan tinggi.', 'realokasi', now() - interval '3 days'),
  ('grid_000_005', 'Kawasan Blok M berada pada status waspada dengan tren kenaikan harga sewa moderat. Pemantauan berkala terhadap laporan mandiri UMKM direkomendasikan sebelum eskalasi ke status bahaya.', 'pemantauan', now() - interval '2 days')
ON CONFLICT (grid_id) DO NOTHING;

-- Only for bahaya (ews_code 2) origins, matching getReallocationForLocation's
-- real logic (src/services/index.ts) -- waspada/aman zones intentionally
-- have none.
INSERT INTO reallocation_candidates (origin_grid_id, rank, recommended_grid_id, recommended_district, distance_m, matching_score, crossed_district)
VALUES
  ('grid_000_000', 1, 'grid_000_012', 'Dukuh Atas', 2650.0, 88.2, true),
  ('grid_000_000', 2, 'grid_000_011', 'Dukuh Atas', 2600.0, 85.0, true),
  ('grid_000_000', 3, 'grid_000_010', 'Dukuh Atas', 2550.0, 82.5, true),
  ('grid_000_001', 1, 'grid_000_012', 'Dukuh Atas', 2680.0, 88.2, true),
  ('grid_000_002', 1, 'grid_000_013', 'Sudirman',   2400.0, 79.0, true)
ON CONFLICT (origin_grid_id, rank) DO NOTHING;

INSERT INTO umkm_businesses (id, name, category, grid_id, district_name, kecamatan, latitude, longitude, dist_to_station_m, reference_price_per_txn_idr, data_confidence, source)
VALUES
  ('umkm_001', 'Warung Bu Sari',        'food_and_beverage', 'grid_000_000', 'Senayan',    'Kebayoran Baru', -6.2440, 106.7992, 180, 18500, 0.90, 'mock_seed'),
  ('umkm_002', 'Toko Kelontong Makmur', 'retail',            'grid_000_001', 'Senayan',    'Kebayoran Baru', -6.2441, 106.7996, 210, 25000, 0.85, 'mock_seed'),
  ('umkm_003', 'Laundry Bersih Cepat',  'services',          'grid_000_002', 'Senayan',    'Kebayoran Baru', -6.2451, 106.8001, 300, 15000, 0.80, 'mock_seed'),
  ('umkm_004', 'Kopi Kenangan Corner',  'food_and_beverage', 'grid_000_005', 'Blok M',     'Kebayoran Baru', -6.2651, 106.8052, 150, 22000, 0.90, 'mock_seed'),
  ('umkm_005', 'Bengkel Motor Jaya',    'services',          'grid_000_006', 'Blok M',     'Kebayoran Baru', -6.2681, 106.8031, 400, 45000, 0.75, 'mock_seed'),
  ('umkm_006', 'Cafe Dukuh Manis',      'food_and_beverage', 'grid_000_010', 'Dukuh Atas', 'Setiabudi',      -6.2214, 106.7991, 120, 32000, 0.95, 'mock_seed'),
  ('umkm_007', 'Butik Anggun',          'retail',            'grid_000_011', 'Dukuh Atas', 'Setiabudi',      -6.2201, 106.7996,  90, 55000, 0.90, 'mock_seed'),
  ('umkm_008', 'Apotek Sehat Selalu',   'retail',            'grid_000_012', 'Dukuh Atas', 'Setiabudi',      -6.2181, 106.7981, 200, 28000, 0.88, 'mock_seed'),
  ('umkm_009', 'Warteg Sudirman',       'food_and_beverage', 'grid_000_013', 'Sudirman',   'Setiabudi',      -6.2351, 106.7901, 350, 14000, 0.82, 'mock_seed'),
  ('umkm_010', 'Salon Cantik Cipete',   'services',          'grid_000_020', 'Cipete',     'Cilandak',       -6.2950, 106.8222, 500, 40000, 0.78, 'mock_seed')
ON CONFLICT (id) DO NOTHING;

-- Shape mirrors titiktemu-analytics' compute_dashboard_metrics() output per
-- titiktemu-frontend's app/types/umkm.ts DashboardSummary type -- the
-- backend passes `metrics` through as-is (see readDashboardSummary in
-- src/repositories/index.ts), so every key the frontend reads must be
-- present here or it 500s/crashes client-side (e.g. Object.entries on a
-- missing by_district).
INSERT INTO dashboard_summary (metrics, computed_at)
SELECT
  jsonb_build_object(
    'total_grid_cells', 12,
    'danger_zone_count', 3,
    'moderate_zone_count', 4,
    'safe_zone_count', 5,
    'danger_zone_pct', 25.0,
    'avg_vulnerability_index', 0.475,
    'avg_matching_score', 65.78,
    'ews_validation_accuracy_pct', 35.1,
    'ews_validation_n', 313,
    'ews_validation_ci_95_low_pct', 30.1,
    'ews_validation_ci_95_high_pct', 40.6,
    'confidence_level', 'high',
    'by_district', jsonb_build_object(
      'Senayan',          jsonb_build_object('danger', 3, 'moderate', 0, 'safe', 0),
      'Sisingamangaraja',  jsonb_build_object('danger', 0, 'moderate', 2, 'safe', 0),
      'Blok M',            jsonb_build_object('danger', 0, 'moderate', 2, 'safe', 0),
      'Dukuh Atas',        jsonb_build_object('danger', 0, 'moderate', 0, 'safe', 3),
      'Sudirman',          jsonb_build_object('danger', 0, 'moderate', 0, 'safe', 1),
      'Cipete',            jsonb_build_object('danger', 0, 'moderate', 0, 'safe', 1)
    ),
    'tenants_needing_reallocation', 3,
    'total_tenants_tracked', 10
  ),
  now()
WHERE NOT EXISTS (SELECT 1 FROM dashboard_summary);
