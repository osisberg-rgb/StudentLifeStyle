// Fælles hook til HomeScreen og ProfilScreen — samme akkumulerede besparelse
// begge steder, plus per-uge serie til besparelse-over-tid-grafen.
// Beregningen ligger i constants/besparelse.ts (ren logik); hooken henter kun
// de felter beregningen bruger, ikke hele plan-JSON'en, og kun ÉT kald.
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import {
  BesparelsesRække, BesparelsesUge, beregnSamletBesparelse, beregnSamletTilbud, byggUgeSerie,
} from '../constants/besparelse';

export { formatKr } from '../constants/besparelse';

type Resultat = {
  sparet: number;
  samletTilbud: number;
  antalPlaner: number;
  uger: BesparelsesUge[];
  klar: boolean;
};

export function useSamletBesparelse(): Resultat {
  const [sparet, setSparet] = useState(0);
  const [samletTilbud, setSamletTilbud] = useState(0);
  const [antalPlaner, setAntalPlaner] = useState(0);
  const [uger, setUger] = useState<BesparelsesUge[]>([]);
  const [klar, setKlar] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let aktiv = true;
      supabase
        .from('madplaner')
        .select('uge_nr, total_spar, total_pris, plan_besparelse:plan->besparelse, plan_pris:plan->indkoebspris, plan_indkoebsliste:plan->indkoebsliste')
        .then(({ data, error }) => {
          if (!aktiv) return;
          if (error) {
            console.error('useSamletBesparelse fejl:', error.message);
          } else {
            const rækker = (data ?? []) as BesparelsesRække[];
            setSparet(beregnSamletBesparelse(rækker));
            setSamletTilbud(beregnSamletTilbud(rækker));
            setAntalPlaner(rækker.length);
            setUger(byggUgeSerie(rækker));
          }
          setKlar(true);
        });
      return () => { aktiv = false; };
    }, [])
  );

  return { sparet, samletTilbud, antalPlaner, uger, klar };
}
