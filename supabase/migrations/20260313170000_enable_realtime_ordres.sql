-- Enable real-time for ordres_livraison table so that 'Responsable Entreprise' get notifications instantly
alter table "public"."ordres_livraison" replica identity full;

do $$
begin
    if not exists (
        select 1 
        from pg_publication_tables 
        where pubname = 'supabase_realtime' and tablename = 'ordres_livraison'
    ) then
        alter publication supabase_realtime add table "public"."ordres_livraison";
    end if;
end $$;
