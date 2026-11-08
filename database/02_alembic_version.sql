-- Suivi Alembic : executer dans la meme transaction que 01_schema.sql.
CREATE TABLE public.alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
INSERT INTO public.alembic_version (version_num) VALUES ('c4e8a1f2b3d7');
