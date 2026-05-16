-- Mock data seed for Bijeli Najam demo
-- Paste into Supabase SQL Editor and Run
-- Creates realistic fake listings, traces, and flags for Split

-- ── 1. Candidate listings ────────────────────────────────────────────────────
insert into candidate_listings (id, platform, external_id, title, host_name, neighborhood, city, approx_lat, approx_lon, url, price_per_night, beds, guests, photos, scraped_at) values

('11111111-0001-0001-0001-000000000001', 'airbnb', 'AB001', 'Luksuzni apartman u srcu Staroga Grada', 'Petar', 'Veli Varoš', 'Split', 43.5083, 16.4378, 'https://www.airbnb.com/rooms/1001', 180, 4, 6, '[]', now() - interval '2 days'),
('11111111-0002-0002-0002-000000000002', 'airbnb', 'AB002', 'Studio Marko — pogled na more', 'Marko', 'Veli Varoš', 'Split', 43.5071, 16.4412, 'https://www.airbnb.com/rooms/1002', 95, 2, 3, '[]', now() - interval '2 days'),
('11111111-0003-0003-0003-000000000003', 'airbnb', 'AB003', 'Sobe Ana — Dioklecijanova palača', 'Ana', 'Grad', 'Split', 43.5098, 16.4450, 'https://www.airbnb.com/rooms/1003', 120, 3, 4, '[]', now() - interval '2 days'),
('11111111-0004-0004-0004-000000000004', 'booking', 'BK004', 'Apartman Sunce — Mali Varoš', 'Sunce d.o.o.', 'Mali Varoš', 'Split', 43.5065, 16.4395, 'https://www.booking.com/hotel/hr/sunce.html', 145, 4, 8, '[]', now() - interval '2 days'),
('11111111-0005-0005-0005-000000000005', 'airbnb', 'AB005', 'Sea View — Bačvice', 'Luka', 'Bačvice', 'Split', 43.5055, 16.4501, 'https://www.airbnb.com/rooms/1005', 220, 5, 8, '[]', now() - interval '2 days'),
('11111111-0006-0006-0006-000000000006', 'airbnb', 'AB006', 'Old Town Flat — Dioklecijanov peristil', 'Ivan', 'Veli Varoš', 'Split', 43.5112, 16.4360, 'https://www.airbnb.com/rooms/1006', 160, 2, 4, '[]', now() - interval '2 days'),
('11111111-0007-0007-0007-000000000007', 'booking', 'BK007', 'Bačvice Beach Apartments', 'Apartments Horvat', 'Bačvice', 'Split', 43.5040, 16.4530, 'https://www.booking.com/hotel/hr/bacvice.html', 190, 3, 6, '[]', now() - interval '2 days'),
('11111111-0008-0008-0008-000000000008', 'airbnb', 'AB008', 'Spinut Studio — tihi kvart', 'Maja', 'Spinut', 'Split', 43.5130, 16.4420, 'https://www.airbnb.com/rooms/1008', 75, 1, 2, '[]', now() - interval '2 days'),
('11111111-0009-0009-0009-000000000009', 'airbnb', 'AB009', 'Apartment Jadranka — blizu plaže', 'Jadranka', 'Bačvice', 'Split', 43.5020, 16.4480, 'https://www.airbnb.com/rooms/1009', 110, 2, 4, '[]', now() - interval '2 days'),
('11111111-0010-0010-0010-000000000010', 'booking', 'BK010', 'Žnjan Paradise Retreat', 'Paradise Rentals', 'Žnjan', 'Split', 43.4990, 16.4600, 'https://www.booking.com/hotel/hr/znjan.html', 250, 6, 10, '[]', now() - interval '2 days'),
('11111111-0011-0011-0011-000000000011', 'airbnb', 'AB011', 'Žnjan Beach House — direktno na more', 'Tomislav', 'Žnjan', 'Split', 43.5005, 16.4620, 'https://www.airbnb.com/rooms/1011', 310, 8, 12, '[]', now() - interval '2 days'),
('11111111-0012-0012-0012-000000000012', 'airbnb', 'AB012', 'Stari Grad Rooms — autentično iskustvo', 'Vesna', 'Veli Varoš', 'Split', 43.5050, 16.4340, 'https://www.airbnb.com/rooms/1012', 88, 2, 3, '[]', now() - interval '2 days'),
('11111111-0013-0013-0013-000000000013', 'booking', 'BK013', 'Sućidar Modern Flat', 'Darko', 'Sućidar', 'Split', 43.5120, 16.4480, 'https://www.booking.com/hotel/hr/sucidar.html', 130, 3, 5, '[]', now() - interval '2 days'),
('11111111-0014-0014-0014-000000000014', 'airbnb', 'AB014', 'Trstenik Studio s terasom', 'Nadia', 'Trstenik', 'Split', 43.5095, 16.4510, 'https://www.airbnb.com/rooms/1014', 85, 1, 2, '[]', now() - interval '2 days'),
('11111111-0015-0015-0015-000000000015', 'airbnb', 'AB015', 'Firule — tiha ulica, 5 min do mora', 'Boris', 'Firule', 'Split', 43.5035, 16.4560, 'https://www.airbnb.com/rooms/1015', 105, 2, 4, '[]', now() - interval '2 days')

on conflict (platform, external_id) do nothing;

-- ── 2. Agent traces ───────────────────────────────────────────────────────────
insert into agent_traces (id, candidate_id, agent_type, model, step_count, final_verdict, final_confidence, final_breakdown, evidence_chain, total_tokens, total_cost_usd, started_at, completed_at) values

('22222222-0001-0001-0001-000000000001', '11111111-0001-0001-0001-000000000001', 'investigation', 'claude-haiku-4-5-20251001', 4, 'flagged', 0.08,
 '{"neighborhood":0.0,"host_name":-0.15,"beds":-0.1,"photo_phash":0.0,"type":0.0}',
 '[{"step_index":0,"fact":"Pretraga kvarta Veli Varoš pronašla je 3 registrirana objekta.","tool_called":"search_htz_registry"},{"step_index":1,"fact":"Nijedno od 3 registrirana objekta ne odgovara imenu domaćina ''Petar''.","tool_called":"get_htz_listing"},{"step_index":2,"fact":"Usporedba fotografija: minimalna Hammingova udaljenost 14 (iznad praga 8) — nema fotomatch.","tool_called":"phash_compare"},{"step_index":3,"fact":"Broj kreveta (4) ne odgovara niti jednom registriranom objektu s imenom sličnim ''Petar'' u Velom Varošu.","tool_called":"normalize_croatian"}]',
 1840, 0.000920, now() - interval '1 day', now() - interval '1 day' + interval '12 seconds'),

('22222222-0002-0002-0002-000000000002', '11111111-0002-0002-0002-000000000002', 'investigation', 'claude-haiku-4-5-20251001', 3, 'flagged', 0.13,
 '{"neighborhood":0.0,"host_name":-0.15,"beds":0.0,"photo_phash":0.0,"type":0.0}',
 '[{"step_index":0,"fact":"Pretraga kvarta Veli Varoš s imenom ''Marko'' — 0 pogodaka u HTZ registru.","tool_called":"search_htz_registry"},{"step_index":1,"fact":"Nema registriranih objekata pod imenom ''Marko'' s 2 kreveta u Velom Varošu.","tool_called":"search_htz_registry"},{"step_index":2,"fact":"Normalizacija adrese nije dala dodatne rezultate.","tool_called":"normalize_croatian"}]',
 1210, 0.000605, now() - interval '1 day', now() - interval '1 day' + interval '8 seconds'),

('22222222-0003-0003-0003-000000000003', '11111111-0003-0003-0003-000000000003', 'investigation', 'claude-haiku-4-5-20251001', 5, 'flagged', 0.19,
 '{"neighborhood":0.0,"host_name":-0.15,"beds":-0.1,"photo_phash":0.0,"type":0.05}',
 '[{"step_index":0,"fact":"Pretraga kvarta Grad — 12 registriranih objekata.","tool_called":"search_htz_registry"},{"step_index":1,"fact":"Domaćin ''Ana'': fuzzy match rezultat 62% za ''Anastazija Klarić'' — ispod praga 80%.","tool_called":"get_htz_listing"},{"step_index":2,"fact":"Broj kreveta (3) ne odgovara niti jednom jakom kandidatu.","tool_called":"get_htz_listing"},{"step_index":3,"fact":"Fotomatch: min Hamming 11 — nema fotomatch.","tool_called":"phash_compare"},{"step_index":4,"fact":"Tip objekta ''Soba'' odgovara kategoriji, ali ostali signali ne podržavaju match.","tool_called":"normalize_croatian"}]',
 2340, 0.001170, now() - interval '1 day', now() - interval '1 day' + interval '18 seconds'),

('22222222-0004-0004-0004-000000000004', '11111111-0004-0004-0004-000000000004', 'investigation', 'claude-haiku-4-5-20251001', 4, 'flagged', 0.05,
 '{"neighborhood":0.0,"host_name":-0.15,"beds":0.0,"photo_phash":0.0,"type":0.0}',
 '[{"step_index":0,"fact":"Pretraga kvarta Mali Varoš — 7 rezultata. Nijedan nije kompanija ''Sunce d.o.o.''.","tool_called":"search_htz_registry"},{"step_index":1,"fact":"Pretraga Sudskog registra: ''Sunce d.o.o.'' — nije pronađena tvrtka s tim nazivom u Splitu.","tool_called":"search_sudski_registar"},{"step_index":2,"fact":"Naziv domaćina je poslovni subjekt, a HTZ ne bilježi registraciju na to ime.","tool_called":"get_htz_listing"},{"step_index":3,"fact":"Geocoding adrese nije dao rezultate.","tool_called":"geocode"}]',
 1980, 0.000990, now() - interval '1 day', now() - interval '1 day' + interval '14 seconds'),

('22222222-0005-0005-0005-000000000005', '11111111-0005-0005-0005-000000000005', 'investigation', 'claude-haiku-4-5-20251001', 4, 'flagged', 0.10,
 '{"neighborhood":0.0,"host_name":-0.15,"beds":-0.1,"photo_phash":0.0,"type":0.0}',
 '[{"step_index":0,"fact":"Pretraga kvarta Bačvice s 5 kreveta — 0 registriranih objekata s 5 kreveta.","tool_called":"search_htz_registry"},{"step_index":1,"fact":"Svi registrirani objekti u Bačvicama imaju manje od 4 kreveta.","tool_called":"search_htz_registry"},{"step_index":2,"fact":"Ime ''Luka'' — fuzzy match 58% s registriranim imenima u kvartu.","tool_called":"get_htz_listing"},{"step_index":3,"fact":"Cijena 220 EUR/noć je iznad prosjeka za registrirane objekte u Bačvicama (142 EUR).","tool_called":"normalize_croatian"}]',
 1760, 0.000880, now() - interval '1 day', now() - interval '1 day' + interval '11 seconds')

on conflict (id) do nothing;

-- ── 3. Trace steps ────────────────────────────────────────────────────────────
insert into trace_steps (id, trace_id, step_index, tool_called, tool_input, tool_output, why, updated_hypothesis, confidence_delta, duration_ms) values

-- Trace 1 steps (Petar, Veli Varoš, 4 beds)
('33333333-1001-0001-0001-000000000001','22222222-0001-0001-0001-000000000001', 0, 'search_htz_registry',
 '{"neighborhood":"Veli Varoš","host_first_name":"Petar","beds":4}',
 '{"count":3,"candidates":[{"id":"reg-001","name":"Apartman Marković","owner":"Petar Marković","beds":2,"neighborhood":"Veli Varoš"},{"id":"reg-002","name":"Studio Luka","owner":"Luka Bebić","beds":4,"neighborhood":"Veli Varoš"},{"id":"reg-003","name":"Apartman Horvat","owner":"Ivana Horvat","beds":3,"neighborhood":"Veli Varoš"}]}',
 'Tražim registrirane objekte u Velom Varošu s 4 kreveta i imenom domaćina ''Petar'' kako bih suzio skup kandidata.',
 'Pronađena su 3 registrirana objekta, ali samo jedan (Marković) ima ime ''Petar'' — uz neodgovarajući broj kreveta (2 vs 4).',
 -0.10, 1840),

('33333333-1001-0002-0001-000000000001','22222222-0001-0001-0001-000000000001', 1, 'get_htz_listing',
 '{"registered_id":"reg-001"}',
 '{"found":true,"id":"reg-001","name":"Apartman Marković","owner":"Petar Marković","beds":2,"category":"Apartman","neighborhood":"Veli Varoš","lat":43.5079,"lon":16.4371}',
 'Dohvaćam detalje za ''Petar Marković'' jer je jedini kandidat s imenom Petar, unatoč razlici u broju kreveta.',
 'Petar Marković ima 2 kreveta, oglas ima 4 — neslaganje od 2 kreveta. To je značajan signal jer HTZ rješenja bilježe točan kapacitet.',
 -0.15, 892),

('33333333-1001-0003-0001-000000000001','22222222-0001-0001-0001-000000000001', 2, 'phash_compare',
 '{"candidate_photo_phashes":["a3f4b2c1d5e6f789","12ab34cd56ef7890"],"registered_id":"reg-001"}',
 '{"min_hamming":14,"is_match":false,"compared_count":4}',
 'Uspoređujem fotografije s registriranim objektom ''reg-001'' jer ime gotovo odgovara, ali broj kreveta ne.',
 'Minimalna Hammingova udaljenost je 14 (>8), dakle fotografije ne odgovaraju. Ni fotomatch ne podupire identifikaciju.',
 -0.08, 2341),

('33333333-1001-0004-0001-000000000001','22222222-0001-0001-0001-000000000001', 3, 'normalize_croatian',
 '{"text":"Veli Varos"}',
 '{"normalized":"veli varos"}',
 'Normaliziram naziv kvarta kako bih pokrio varijante pisanja i osigurao usklađenost s registrom.',
 'Normalizacija potvrđuje kvart. Ukupna ocjena pouzdanosti ostaje niska — nema dovoljno podudarnih signala za ''clear'' presudu.',
 0.01, 43),

-- Trace 4 steps (Sunce d.o.o., Mali Varoš — company host)
('33333333-4001-0001-0001-000000000001','22222222-0004-0004-0004-000000000004', 0, 'search_htz_registry',
 '{"neighborhood":"Mali Varoš","beds":4}',
 '{"count":7,"candidates":[{"id":"reg-010","name":"Soba Kovačević","owner":"Marija Kovačević","beds":4,"neighborhood":"Mali Varoš"},{"id":"reg-011","name":"Apartman Petrić","owner":"Josip Petrić","beds":3,"neighborhood":"Mali Varoš"}]}',
 'Tražim registrirane objekte u Malom Varošu s 4 kreveta jer je oglas prikazan pod poslovnim imenom ''Sunce d.o.o.''.',
 'Pronađena su 7 objekata u Malom Varošu, 2 s 4 kreveta — ali ni jedan nije registriran na tvrtku.',
 -0.05, 1200),

('33333333-4002-0002-0001-000000000001','22222222-0004-0004-0004-000000000004', 1, 'search_sudski_registar',
 '{"company_name":"Sunce d.o.o."}',
 '{"found":false,"company_name":"Sunce d.o.o.","oib":null,"directors":[],"registered_seat":null}',
 'Domaćin je naveden kao ''Sunce d.o.o.'' — poslovni subjekt. Pretražujem Sudski registar.',
 'Tvrtka ''Sunce d.o.o.'' nije pronađena u Sudskom registru. HTZ registar ne bilježi iznajmljivanje na neregistriranu tvrtku.',
 -0.20, 3100),

('33333333-4003-0003-0001-000000000001','22222222-0004-0004-0004-000000000004', 2, 'get_htz_listing',
 '{"registered_id":"reg-010"}',
 '{"found":true,"id":"reg-010","name":"Soba Kovačević","owner":"Marija Kovačević","beds":4,"category":"Soba","neighborhood":"Mali Varoš","lat":43.5062,"lon":16.4388}',
 'Provjera najbližeg registriranog objekta s 4 kreveta — Marija Kovačević.',
 'Ime vlasnika ''Marija Kovačević'' ne odgovara ''Sunce d.o.o.''. Neregistrirana kompanija kao domaćin je jak negativni signal.',
 -0.10, 780),

('33333333-4004-0004-0001-000000000001','22222222-0004-0004-0004-000000000004', 3, 'geocode',
 '{"address_fragment":"Mali Varoš 12, Split"}',
 '{"found":false}',
 'Pokušavam geolokacijom provjeriti adresu iz opisa oglasa.',
 'Geocoding nije dao rezultate. Nema dodatnih signala. Presuda: flagged s pouzdanošću 95%.',
 0.0, 1100)

on conflict (trace_id, step_index) do nothing;

-- ── 4. Entity links ───────────────────────────────────────────────────────────
insert into entity_links (id, candidate_id, registered_id, verdict, confidence, match_signals, composite_key, trace_id, matched_at) values

('44444444-0001-0001-0001-000000000001','11111111-0001-0001-0001-000000000001', null, 'unmatched', 0.08,
 '{"neighborhood":{"fired":true,"score":1.0,"evidence":"Veli Varoš potvrđen"},"host_name":{"fired":false,"score":0.3,"evidence":"Fuzzy match 30% — Petar ≠ ostala registrirana imena"},"beds":{"fired":false,"score":0.2,"evidence":"4 kreveta vs 2 u registru"},"photo_phash":{"fired":false,"score":0.0,"evidence":"Hamming 14 — nije fotomatch"},"type":{"fired":false,"score":0.5,"evidence":"Apartman — odgovara kategoriji"}}',
 '{"kvart":"Veli Varoš","beds":4,"host_first_name":"Petar"}',
 '22222222-0001-0001-0001-000000000001', now() - interval '1 day'),

('44444444-0002-0002-0002-000000000002','11111111-0002-0002-0002-000000000002', null, 'unmatched', 0.13,
 '{"neighborhood":{"fired":true,"score":1.0,"evidence":"Veli Varoš potvrđen"},"host_name":{"fired":false,"score":0.0,"evidence":"Nema registriranog ''Marko'' u kvartu"},"beds":{"fired":false,"score":0.5,"evidence":"2 kreveta — nema direktnog podudaranja"},"photo_phash":{"fired":false,"score":0.0,"evidence":"Nema fotografija za usporedbu"},"type":{"fired":false,"score":0.5,"evidence":"Studio — odgovara kategoriji"}}',
 '{"kvart":"Veli Varoš","beds":2,"host_first_name":"Marko"}',
 '22222222-0002-0002-0002-000000000002', now() - interval '1 day'),

('44444444-0003-0003-0003-000000000003','11111111-0003-0003-0003-000000000003', null, 'unmatched', 0.19,
 '{"neighborhood":{"fired":true,"score":1.0,"evidence":"Grad potvrđen"},"host_name":{"fired":false,"score":0.62,"evidence":"''Ana'' — fuzzy 62% s ''Anastazija'' — ispod praga 80%"},"beds":{"fired":false,"score":0.3,"evidence":"3 kreveta — nije podudaranje"},"photo_phash":{"fired":false,"score":0.0,"evidence":"Hamming 11 — nije fotomatch"},"type":{"fired":true,"score":0.8,"evidence":"Soba — odgovara kategoriji"}}',
 '{"kvart":"Grad","beds":3,"host_first_name":"Ana"}',
 '22222222-0003-0003-0003-000000000003', now() - interval '1 day'),

('44444444-0004-0004-0004-000000000004','11111111-0004-0004-0004-000000000004', null, 'unmatched', 0.05,
 '{"neighborhood":{"fired":true,"score":1.0,"evidence":"Mali Varoš potvrđen"},"host_name":{"fired":false,"score":0.0,"evidence":"Kompanija ''Sunce d.o.o.'' nije pronađena u HTZ ni Sudskom registru"},"beds":{"fired":false,"score":0.5,"evidence":"4 kreveta — djelomično podudaranje"},"photo_phash":{"fired":false,"score":0.0,"evidence":"Nema fotografija"},"type":{"fired":false,"score":0.5,"evidence":"Apartman — odgovara"}}',
 '{"kvart":"Mali Varoš","beds":4,"host_first_name":null}',
 '22222222-0004-0004-0004-000000000004', now() - interval '1 day'),

('44444444-0005-0005-0005-000000000005','11111111-0005-0005-0005-000000000005', null, 'unmatched', 0.10,
 '{"neighborhood":{"fired":true,"score":1.0,"evidence":"Bačvice potvrđen"},"host_name":{"fired":false,"score":0.35,"evidence":"''Luka'' — fuzzy 35% — nije podudaranje"},"beds":{"fired":false,"score":0.0,"evidence":"5 kreveta — 0 registriranih objekata s 5 kreveta u Bačvicama"},"photo_phash":{"fired":false,"score":0.0,"evidence":"Nema fotografija"},"type":{"fired":false,"score":0.5,"evidence":"Apartman"}}',
 '{"kvart":"Bačvice","beds":5,"host_first_name":"Luka"}',
 '22222222-0005-0005-0005-000000000005', now() - interval '1 day')

on conflict (candidate_id) do nothing;

-- ── 5. Flags ──────────────────────────────────────────────────────────────────
insert into flags (id, candidate_id, entity_link_id, trace_id, confidence_unregistered, status, notes) values

('55555555-0001-0001-0001-000000000001','11111111-0001-0001-0001-000000000001','44444444-0001-0001-0001-000000000001','22222222-0001-0001-0001-000000000001', 0.92, 'open', 'MONEY_SHOT_1'),
('55555555-0002-0002-0002-000000000002','11111111-0002-0002-0002-000000000002','44444444-0002-0002-0002-000000000002','22222222-0002-0002-0002-000000000002', 0.87, 'open', 'MONEY_SHOT_2'),
('55555555-0003-0003-0003-000000000003','11111111-0003-0003-0003-000000000003','44444444-0003-0003-0003-000000000003','22222222-0003-0003-0003-000000000003', 0.81, 'open', 'MONEY_SHOT_3'),
('55555555-0004-0004-0004-000000000004','11111111-0004-0004-0004-000000000004','44444444-0004-0004-0004-000000000004','22222222-0004-0004-0004-000000000004', 0.95, 'open', 'MONEY_SHOT_4'),
('55555555-0005-0005-0005-000000000005','11111111-0005-0005-0005-000000000005','44444444-0005-0005-0005-000000000005','22222222-0005-0005-0005-000000000005', 0.90, 'open', 'MONEY_SHOT_5')

on conflict (candidate_id) do nothing;

-- ── 6. Update neighborhoods with counts ───────────────────────────────────────
update neighborhoods set flag_count = 2, registered_count = 14, estimated_annual_loss_eur = 87400 where slug = 'veli-varos';
update neighborhoods set flag_count = 1, registered_count = 8,  estimated_annual_loss_eur = 52200 where slug = 'mali-varos';
update neighborhoods set flag_count = 2, registered_count = 6,  estimated_annual_loss_eur = 94800 where slug = 'bacvice';
update neighborhoods set flag_count = 1, registered_count = 12, estimated_annual_loss_eur = 31600 where slug = 'grad';
update neighborhoods set flag_count = 0, registered_count = 5,  estimated_annual_loss_eur = 18200 where slug = 'spinut';
update neighborhoods set flag_count = 0, registered_count = 3,  estimated_annual_loss_eur = 12400 where slug = 'znjan';
update neighborhoods set flag_count = 0, registered_count = 9,  estimated_annual_loss_eur = 22100 where slug = 'firule';
update neighborhoods set flag_count = 0, registered_count = 4,  estimated_annual_loss_eur = 9800  where slug = 'sucidar';
update neighborhoods set flag_count = 0, registered_count = 2,  estimated_annual_loss_eur = 6400  where slug = 'trstenik';

-- ── 7. Mock monitoring delta ──────────────────────────────────────────────────
insert into monitoring_deltas (id, candidate_id, delta_type, before_value, after_value, detected_at, triage_verdict, triage_reason, is_mock) values
('66666666-0001-0001-0001-000000000001',
 '11111111-0004-0004-0004-000000000004',
 'host_changed',
 '{"host_name":"Sunce","beds":4}',
 '{"host_name":"Apartments Sunce d.o.o.","beds":8}',
 now() - interval '6 hours',
 'reinvestigate',
 'Domaćin promijenjen iz fizičke osobe ''Sunce'' u tvrtku ''Apartments Sunce d.o.o.'' i broj kreveta udvostručen s 4 na 8. Identitetska promjena — preporučuje se ponovna istraga.',
 true)
on conflict (id) do nothing;
