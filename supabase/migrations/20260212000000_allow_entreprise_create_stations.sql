-- Permettre aux responsables d'entreprise de créer et gérer leurs propres stations
-- INSERT : peut créer une station pour son entreprise
CREATE POLICY "Responsable entreprise can insert stations for their company"
  ON public.stations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'responsable_entreprise') AND
    entreprise_id::text = public.get_user_entreprise_id(auth.uid())
  );

-- UPDATE : peut modifier les stations de son entreprise
CREATE POLICY "Responsable entreprise can update their stations"
  ON public.stations FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'responsable_entreprise') AND
    entreprise_id::text = public.get_user_entreprise_id(auth.uid())
  );
