-- Fix policy comparing UUID to TEXT for station insertions
DROP POLICY IF EXISTS "Responsable entreprise can insert stations for their company" ON public.stations;
DROP POLICY IF EXISTS "Responsable entreprise can update their stations" ON public.stations;
DROP POLICY IF EXISTS "Responsable entreprise can manage their stations" ON public.stations;

-- INSERT : peut créer une station pour son entreprise
CREATE POLICY "Responsable entreprise can insert stations for their company"
  ON public.stations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'responsable_entreprise') AND
    entreprise_id = NULLIF(public.get_user_entreprise_id(auth.uid()), '')::uuid
  );

-- UPDATE : peut modifier les stations de son entreprise
CREATE POLICY "Responsable entreprise can update their stations"
  ON public.stations FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'responsable_entreprise') AND
    entreprise_id = NULLIF(public.get_user_entreprise_id(auth.uid()), '')::uuid
  );

CREATE POLICY "Responsable entreprise can manage their stations"
  ON public.stations FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'responsable_entreprise') AND
    entreprise_id = NULLIF(public.get_user_entreprise_id(auth.uid()), '')::uuid
  );
