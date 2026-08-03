import { WalletHistoryContent } from '@/app/(cabinet)/wallet/history/history-content';

export const metadata = {
  title: 'Amallar tarixi',
  description: "Hamyondagi barcha to'lovlar va o'tkazmalar.",
};

export default function WalletHistoryPage() {
  return <WalletHistoryContent />;
}
