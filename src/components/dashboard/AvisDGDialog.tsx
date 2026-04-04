import { useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AvisDGDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
  dossierNumero: string;
  onSuccess: () => void;
}

export function AvisDGDialog({ open, onOpenChange, dossierId, dossierNumero, onSuccess }: AvisDGDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [typeAvis, setTypeAvis] = useState<'favorable' | 'defavorable' | 'reserve'>('favorable');
  const [commentaire, setCommentaire] = useState('');

  const handleSubmit = async () => {
    if (!commentaire || commentaire.length < 10) {
      toast({
        variant: "destructive",
        title: "Commentaire requis",
        description: "Veuillez argumenter votre avis DG (min. 10 caractères).",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('dossiers_entreprise')
        .update({
          statut: 'avis_dg',
          avis_dg_type: typeAvis,
          avis_dg_commentaire: commentaire,
          updated_at: new Date().toISOString()
        })
        .eq('id', dossierId);

      if (error) throw error;

      toast({
        title: "Avis rendu avec succès",
        description: `L'avis ${typeAvis} a été enregistré pour le dossier ${dossierNumero}.`,
      });
      
      onSuccess();
      onOpenChange(false);
      setCommentaire('');
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer l'avis.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-primary" />
            Rendre un Avis DG
          </DialogTitle>
          <DialogDescription className="font-bold text-slate-500 uppercase text-[10px] tracking-widest">
            Dossier de référence : {dossierNumero}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Type d'Avis Stratégique</label>
            <Select value={typeAvis} onValueChange={(v: any) => setTypeAvis(v)}>
              <SelectTrigger className="rounded-xl border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="favorable" className="text-emerald-600 font-bold">FAVORABLE</SelectItem>
                <SelectItem value="defavorable" className="text-red-600 font-bold">DÉFAVORABLE</SelectItem>
                <SelectItem value="reserve" className="text-amber-600 font-bold">RESERVÉ / À COMPLÉTER</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Instruction & Justification</label>
            <Textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Saisissez ici votre analyse stratégique ou vos réserves..."
              className="min-h-[120px] rounded-2xl border-slate-200 focus:ring-primary shadow-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold uppercase text-[10px]">
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] px-8"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Enregistrer l'Avis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
