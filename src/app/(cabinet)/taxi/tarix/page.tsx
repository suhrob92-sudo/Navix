import { TaxiHistoryContent } from '@/app/(cabinet)/taxi/tarix/history-content';

export const metadata = {
  title: 'Safarlar tarixi',
  description: "O'tgan safarlaringiz, ularning masofasi va narxi.",
};

export default function TaxiHistoryPage() {
  return <TaxiHistoryContent />;
}
