--
-- PostgreSQL database dump
--

\restrict 21XedNjOLYiw5IOBH8HQC3OKNTPqdKUMC7Ne3mfQJ7Lbqo50K1fPWeVd2B2IfyF

-- Dumped from database version 17.11 (Debian 17.11-1.pgdg13+2)
-- Dumped by pg_dump version 17.11 (Debian 17.11-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: service_category; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.service_category (id, name, code, created_at, updated_at) VALUES ('48f55fa9-8d2c-45c1-bca7-590453868268', 'Financement', 'FIN', '2026-11-07 11:14:57.800774+00', '2026-11-07 11:14:57.800774+00') ON CONFLICT DO NOTHING;
INSERT INTO public.service_category (id, name, code, created_at, updated_at) VALUES ('afbdf5ba-825e-44b1-8568-eaa285f98f87', 'Assurance', 'ASS', '2026-11-07 11:14:57.800774+00', '2026-11-07 11:14:57.800774+00') ON CONFLICT DO NOTHING;
INSERT INTO public.service_category (id, name, code, created_at, updated_at) VALUES ('87320391-6b5d-4de4-b11f-84588856e79e', 'Garantie', 'GAR', '2026-11-07 11:14:57.800774+00', '2026-11-07 11:14:57.800774+00') ON CONFLICT DO NOTHING;
INSERT INTO public.service_category (id, name, code, created_at, updated_at) VALUES ('81fd0019-4dbd-4419-8b04-f397b64f941d', 'Entretien', 'ENT', '2026-11-07 11:14:57.800774+00', '2026-11-07 11:14:57.800774+00') ON CONFLICT DO NOTHING;
INSERT INTO public.service_category (id, name, code, created_at, updated_at) VALUES ('a04b42bb-60ae-4289-afc8-3979c397847d', 'Accessoires', 'ACC', '2026-11-07 11:14:57.800774+00', '2026-11-07 11:14:57.800774+00') ON CONFLICT DO NOTHING;
INSERT INTO public.service_category (id, name, code, created_at, updated_at) VALUES ('0d34a3d7-f312-4ab2-9aab-856a8c61dd46', 'Livraison', 'LIV', '2026-11-07 11:14:57.800774+00', '2026-11-07 11:14:57.800774+00') ON CONFLICT DO NOTHING;
INSERT INTO public.service_category (id, name, code, created_at, updated_at) VALUES ('da691a56-ce92-4ebd-9e84-c37332945fc1', 'Formation', 'FOR', '2026-11-07 11:14:57.800774+00', '2026-11-07 11:14:57.800774+00') ON CONFLICT DO NOTHING;


--
-- Data for Name: service; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.service (id, name, price, category_id, description, active, created_at, updated_at) VALUES ('4aa890be-56a0-4147-8254-c7536c99ccb0', 'Financement personnalisé', 299.00, '48f55fa9-8d2c-45c1-bca7-590453868268', 'Montage de dossier de financement sur mesure', true, '2026-11-07 11:14:57.800774+00', '2026-11-07 11:14:57.800774+00') ON CONFLICT DO NOTHING;
INSERT INTO public.service (id, name, price, category_id, description, active, created_at, updated_at) VALUES ('9cd0b203-1aba-4045-93bf-62d71ebdd6a1', 'Assurance tous risques', 850.00, 'afbdf5ba-825e-44b1-8568-eaa285f98f87', 'Couverture complète du véhicule', true, '2026-11-07 11:14:57.800774+00', '2026-11-07 11:14:57.800774+00') ON CONFLICT DO NOTHING;
INSERT INTO public.service (id, name, price, category_id, description, active, created_at, updated_at) VALUES ('4aed069a-5518-4898-8fa0-a87419d4e507', 'Garantie étendue 3 ans', 1200.00, '87320391-6b5d-4de4-b11f-84588856e79e', 'Extension de garantie constructeur', true, '2026-11-07 11:14:57.800774+00', '2026-11-07 11:14:57.800774+00') ON CONFLICT DO NOTHING;
INSERT INTO public.service (id, name, price, category_id, description, active, created_at, updated_at) VALUES ('4eff856e-3422-4448-8b49-2698cce0dd1e', 'Pack entretien 5 ans', 890.00, '81fd0019-4dbd-4419-8b04-f397b64f941d', 'Forfait entretien pour 5 années', true, '2026-11-07 11:14:57.800774+00', '2026-11-07 11:14:57.800774+00') ON CONFLICT DO NOTHING;
INSERT INTO public.service (id, name, price, category_id, description, active, created_at, updated_at) VALUES ('1d8fe1c1-eef2-47fd-92b8-fc8b09bbfa35', 'Tapis de sol premium', 149.00, 'a04b42bb-60ae-4289-afc8-3979c397847d', 'Jeu complet de tapis sur mesure', true, '2026-11-07 11:14:57.800774+00', '2026-11-07 11:14:57.800774+00') ON CONFLICT DO NOTHING;
INSERT INTO public.service (id, name, price, category_id, description, active, created_at, updated_at) VALUES ('91169048-c05d-4ea1-95ac-457c1f1b3cdc', 'Livraison à domicile', 250.00, '0d34a3d7-f312-4ab2-9aab-856a8c61dd46', 'Livraison du véhicule au domicile', true, '2026-11-07 11:14:57.800774+00', '2026-11-07 11:14:57.800774+00') ON CONFLICT DO NOTHING;
INSERT INTO public.service (id, name, price, category_id, description, active, created_at, updated_at) VALUES ('11e4e230-5108-4a35-8abc-add385ab004b', 'Formation conduite éco', 180.00, 'da691a56-ce92-4ebd-9e84-c37332945fc1', 'Formation à la conduite économique', true, '2026-11-07 11:14:57.800774+00', '2026-11-07 11:14:57.800774+00') ON CONFLICT DO NOTHING;
INSERT INTO public.service (id, name, price, category_id, description, active, created_at, updated_at) VALUES ('96415363-db7b-4edf-99d0-76d935a14e45', 'Assurance vol/incendie', 450.00, 'afbdf5ba-825e-44b1-8568-eaa285f98f87', 'Protection contre le vol et l incendie', true, '2026-11-07 11:14:57.800774+00', '2026-11-07 11:14:57.800774+00') ON CONFLICT DO NOTHING;
INSERT INTO public.service (id, name, price, category_id, description, active, created_at, updated_at) VALUES ('58b445e9-e63c-4c4c-85e1-7c5d4494ea36', 'Kit mains libres Bluetooth', 299.00, 'a04b42bb-60ae-4289-afc8-3979c397847d', 'Installation kit mains libres', true, '2026-11-07 11:14:57.800774+00', '2026-11-07 11:14:57.800774+00') ON CONFLICT DO NOTHING;
INSERT INTO public.service (id, name, price, category_id, description, active, created_at, updated_at) VALUES ('35a4f80f-2107-4510-9e20-f2e549ecf5f2', 'Vitres teintées', 380.00, 'a04b42bb-60ae-4289-afc8-3979c397847d', 'Pose de films teintés réglementaires', true, '2026-11-07 11:14:57.800774+00', '2026-11-07 11:14:57.800774+00') ON CONFLICT DO NOTHING;


--
-- PostgreSQL database dump complete
--

\unrestrict 21XedNjOLYiw5IOBH8HQC3OKNTPqdKUMC7Ne3mfQJ7Lbqo50K1fPWeVd2B2IfyF

