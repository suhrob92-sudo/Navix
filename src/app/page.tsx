import { ArrowRight, Bot, Layers, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { AuroraBackground } from '@/components/shared/aurora-background';
import { HeroActions } from '@/components/shared/hero-actions';
import { ModuleCard } from '@/components/shared/module-card';
import { SectionHeading } from '@/components/shared/section-heading';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { APP_MODULES, MODULE_CATEGORIES, ModuleStatus, getModulesByCategory } from '@/config/modules';
import { siteConfig } from '@/config/site';

/** AI yordamchi nimalarni qila olishini ko'rsatuvchi namunalar. */
const AI_EXAMPLES = [
  { command: 'Taxi chaqir', result: 'Taksi moduli ochiladi va yaqin haydovchi topiladi' },
  { command: 'Pizza buyurtma qil', result: "Yaqin restoranlar ro'yxati chiqadi" },
  { command: 'Ish top', result: 'Sizga mos vakansiyalar tanlanadi' },
  { command: "Kommunal to'lovlarni to'la", result: "To'lovlar moduli hisoblar bilan ochiladi" },
] as const;

/** Platformaning texnik ustunliklari. */
const PLATFORM_PILLARS = [
  {
    icon: Layers,
    title: 'Modulli arxitektura',
    description:
      "Har bir xizmat mustaqil modul. Yangi modul qo'shish uchun mavjud kodga tegish shart emas — kelajakda mikroservislarga ajratish ham oson.",
  },
  {
    icon: ShieldCheck,
    title: "Xavfsizlik birinchi o'rinda",
    description:
      "JWT autentifikatsiya, rollarga asoslangan ruxsatlar (RBAC), audit jurnali va barcha kirish ma'lumotlarini tekshirish — poydevordan boshlab.",
  },
  {
    icon: Zap,
    title: 'Millionlab foydalanuvchiga tayyor',
    description:
      'Redis keshi, indekslangan PostgreSQL jadvallari va Docker orqali gorizontal kengayish imkoniyati.',
  },
] as const;

export default function HomePage() {
  const liveModuleCount = APP_MODULES.filter((module) => module.status === ModuleStatus.LIVE).length;

  return (
    <>
      <SiteHeader />

      <main className="flex-1">
        {/* ---------------- Bosh ekran (Hero) ---------------- */}
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
          <AuroraBackground />

          <Container className="relative">
            <div className="mx-auto max-w-3xl text-center">
              <div className="animate-fade-up flex justify-center">
                <Badge className="gap-2 px-4 py-1.5 text-sm">
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  {siteConfig.tagline}
                </Badge>
              </div>

              <h1
                className="animate-fade-up mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-6xl"
                style={{ animationDelay: '80ms' }}
              >
                Bitta ilova — <span className="text-gradient">butun hayotingiz</span> uchun
              </h1>

              <p
                className="animate-fade-up text-muted-foreground mt-6 text-lg leading-relaxed text-pretty"
                style={{ animationDelay: '160ms' }}
              >
                Taksi chaqiring, ovqat buyurtma qiling, to&apos;lovlarni amalga oshiring, ish toping va sayohat
                rejalashtiring. AI yordamchi esa bularning barchasini siz uchun bir jumla bilan bajaradi.
              </p>

              <div className="animate-fade-up mt-9" style={{ animationDelay: '240ms' }}>
                <HeroActions />
              </div>

              {/* Statistika */}
              <dl
                className="animate-fade-up mx-auto mt-14 grid max-w-lg grid-cols-3 gap-4"
                style={{ animationDelay: '320ms' }}
              >
                {[
                  { label: 'Reja qilingan modul', value: APP_MODULES.length },
                  { label: 'Ishga tushgan modul', value: liveModuleCount },
                  { label: "Xizmat yo'nalishi", value: MODULE_CATEGORIES.length },
                ].map((stat) => (
                  <div key={stat.label} className="glass rounded-xl px-3 py-4">
                    <dt className="text-muted-foreground text-xs">{stat.label}</dt>
                    <dd className="mt-1 text-2xl font-semibold tabular-nums">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Container>
        </section>

        {/* ---------------- Modullar ---------------- */}
        <section id="modullar" className="scroll-mt-24 py-16 sm:py-20">
          <Container>
            <SectionHeading
              eyebrow="Xizmatlar"
              title="Kundalik hayot uchun kerak bo'lgan hamma narsa"
              description="Har bir xizmat mustaqil modul sifatida ishlab chiqiladi va bosqichma-bosqich ishga tushiriladi."
            />

            <div className="mt-14 space-y-14">
              {MODULE_CATEGORIES.map((category) => {
                const modules = getModulesByCategory(category.id);
                if (modules.length === 0) return null;

                return (
                  <div key={category.id}>
                    <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="text-xl font-semibold tracking-tight">{category.name}</h3>
                      <p className="text-muted-foreground text-sm">{category.description}</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {modules.map((module, index) => (
                        <ModuleCard key={module.id} module={module} index={index} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Container>
        </section>

        {/* ---------------- AI yordamchi ---------------- */}
        <section id="ai" className="scroll-mt-24 py-16 sm:py-20">
          <Container>
            <div className="glass relative overflow-hidden rounded-2xl p-6 sm:p-10">
              <AuroraBackground className="opacity-60" />

              <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
                <div>
                  <Badge className="gap-2">
                    <Bot className="size-3.5" aria-hidden="true" />
                    AI yordamchi
                  </Badge>

                  <h2 className="mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                    Gapiring — qolganini <span className="text-gradient">AI bajaradi</span>
                  </h2>

                  <p className="text-muted-foreground mt-4 leading-relaxed text-pretty">
                    Menyularni qidirib o&apos;tirish shart emas. Oddiy jumla yozing yoki ayting — AI yordamchi
                    kerakli modulni o&apos;zi ochadi va amalni sizning nomingizdan bajaradi.
                  </p>

                  <Button className="mt-7" variant="glass" asChild>
                    <Link href="/assistant">
                      AI yordamchi haqida
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                </div>

                <ul className="space-y-3">
                  {AI_EXAMPLES.map((example, index) => (
                    <li
                      key={example.command}
                      className="animate-fade-up bg-card/60 border-border/60 rounded-xl border p-4"
                      style={{ animationDelay: `${index * 90}ms` }}
                    >
                      <p className="flex items-center gap-2 font-medium">
                        <span className="text-primary">“</span>
                        {example.command}
                        <span className="text-primary">”</span>
                      </p>
                      <p className="text-muted-foreground mt-1.5 flex items-start gap-2 text-sm">
                        <ArrowRight className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                        {example.result}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Container>
        </section>

        {/* ---------------- Texnologiya ---------------- */}
        <section id="texnologiya" className="scroll-mt-24 py-16 sm:py-20">
          <Container>
            <SectionHeading
              eyebrow="Texnologiya"
              title="Kundalik ehtiyoj uchun oddiy, miqyos uchun kuchli"
              description="Platforma birinchi kundanoq millionlab foydalanuvchini ko'tara oladigan qilib loyihalashtirilgan."
            />

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {PLATFORM_PILLARS.map((pillar, index) => {
                const Icon = pillar.icon;

                return (
                  <Card
                    key={pillar.title}
                    variant="glass"
                    className="animate-fade-up"
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    <span className="from-primary/15 to-accent/15 text-primary ring-primary/10 inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ring-1">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <CardTitle className="mt-4">{pillar.title}</CardTitle>
                    <CardDescription className="mt-2">{pillar.description}</CardDescription>
                  </Card>
                );
              })}
            </div>
          </Container>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
