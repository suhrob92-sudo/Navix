import { CabinetSidebar, CabinetTabBar } from '@/components/layout/cabinet-nav';
import { SiteHeader } from '@/components/layout/site-header';
import { Container } from '@/components/ui/container';
import { RequireAuth } from '@/modules/auth/require-auth';

/**
 * Shaxsiy kabinet qolipi.
 *
 * `(cabinet)` — Next.js "route group": qavs ichidagi nom MANZILGA TUSHMAYDI.
 * Ya'ni `/dashboard` manzili o'zgarmaydi, lekin barcha kabinet sahifalari
 * shu qolipni va himoyani baham ko'radi.
 */
export default function CabinetLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <SiteHeader />

      <Container className="flex-1 pt-6 pb-28 lg:pb-16">
        <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:gap-8">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <CabinetSidebar />
          </aside>

          <main className="min-w-0">{children}</main>
        </div>
      </Container>

      <CabinetTabBar />
    </RequireAuth>
  );
}
