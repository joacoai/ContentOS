-- Agregar campo estructura al plan de contenido
alter table content_plan add column if not exists estructura text[];
