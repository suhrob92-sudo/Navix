import { ArrowRight, Bot, Layers, ShieldCheck, Wallet, Zap } from 'lucide-react';
import Link from 'next/link';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { AuroraBackground } from '@/components/shared/aurora-background';
import { HeroBackdrop } from '@/components/shared/hero-backdrop';
import { HeroActions } from '@/components/shared/hero-actions';
import { ModuleCard } from '@/components/shared/module-card';
import { SectionHeading } from '@/components/shared/section-heading';
import { ServiceIcon } from '@/components/app/service-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import {
  MODULE_CATEGORIES,
  ModuleStatus,
  getModuleById,
  getModulesByCategory,
  getQuickServices,
} from '@/config/modules';

/** AI yordamchi nimalarni qila olishini ko'rsatuvchi namunalar. */
const AI_EXAMPLES = [
  { command: 'Taxi chaqir', result: 'Taksi moduli ochiladi va yaqin haydovchi topiladi' },
  { command: 'Pizza buyurtma qil', result: "Yaqin restoranlar ro'yxati chiqadi" },
  { command: 'Ish top', result: 'Sizga mos vakansiyalar tanlanadi' },
  { command: "Kommunal to'lovlarni to'la", result: "To'lovlar moduli hisoblar bilan ochiladi" },
] as const;

/**
 * Platforma qanday qurilgani.
 *
 * ── Nima uchun bu yerda VA'DA yo'q ────────────────────────────────────
 * Ilgari bu bo'limda "millionlab foydalanuvchiga tayyor" degan jumla
 * turardi. Buni hech kim tekshirmagan: ilova hali ishga tushmagan,
 * yuklama sinovi o'tkazilmagan. Ya'ni bu o'lchov emas, umid edi.
 *
 * Bunday jumlaning narxi yuqori. Uni o'qigan hamkor yoki investor shu
 * asosda qaror qiladi va birinchi jiddiy yuklamada haqiqat ochilsa,
 * ishonch yo'qoladi.
 *
 * Shuning uchun bu yerda faqat KODDA BOR narsalar sanaladi. Har bir
 * jumlani repozitoriyni ochib tekshirish mumkin. Haqiqiy raqamlar
 * (foydalanuvchi soni, javob tezligi) ishga tushgandan keyin
 * qo'shiladi — o'shanda ular ancha kuchli bo'ladi.
 */
const PLATFORM_PILLARS = [
  {
    icon: Layers,
    title: 'Modulli tuzilma',
    description:
      "Har bir xizmat alohida modul: nomi, manzili va holati bitta reyestrda yozilgan. Bosh sahifadagi ro'yxat ham o'sha yerdan olinadi — qo'lda yangilanmaydi.",
  },
  {
    icon: ShieldCheck,
    title: 'Ruxsat va audit',
    description:
      "Kirish JWT bilan, har bir amal rol va ruxsat bo'yicha tekshiriladi. Jiddiy amallar audit jurnaliga tushadi va jurnal faqat o'qish uchun — uni tahrirlab bo'lmaydi.",
  },
  {
    icon: Wallet,
    title: 'Pul hisobi',
    description:
      "Summalar tiyinda, butun sonda saqlanadi — kasr xatosi bo'lmaydi. Balans har doim tranzaksiya yozuvi bilan birga o'zgaradi, takroriy so'rovni esa bazadagi yagona kalit to'xtatadi.",
  },
  {
    icon: Zap,
    title: 'Tezlik uchun tayyorgarlik',
    description:
      "Ko'p ishlatiladigan so'rovlar indekslangan va ular haqiqiy hajmda o'lchangan. Sessiya, cheklovlar va tez-tez o'qiladigan ma'lumot Redis'da turadi.",
  },
] as const;

/**
 * Bosh ekranda ko'rsatiladigan xizmatlar.
 *
 * ── Nima uchun faqat ISHLAYOTGANLARI ──────────────────────────────────
 * Ilgari bu yerda "18 ta reja qilingan modul" degan raqam turardi.
 * Bunday raqam foydalanuvchiga hech narsa bermaydi: u nima qila
 * olishini emas, biz nima rejalashtirganimizni aytadi.
 *
 * Undan ham yomoni — sarlavhada "Taksi chaqiring" deb yozilgandi,
 * holbuki taksi hali ishlamaydi. Bu va'da bajarilmasdi.
 *
 * Endi ro'yxat reyestrdan olinadi va faqat HOLATI "LIVE" bo'lgan
 * xizmatlar chiqadi. Taksi ishga tushgan kuni u o'z-o'zidan paydo
 * bo'ladi — kodni o'zgartirish shart emas.
 */
function heroServices() {
  const quick = getQuickServices().filter((module) => module.status === ModuleStatus.LIVE);
  const assistant = getModuleById('ai-assistant');

  /*
    AI yordamchi "tezkor xizmat" emas — u boshqalarini boshqaradi.
    Shuning uchun reyestrda `quickOrder` yo'q, lekin bosh ekranda
    ko'rinishi kerak: bu ilovaning eng ko'zga tashlanadigan imkoniyati.
  */
  return assistant && assistant.status === ModuleStatus.LIVE ? [...quick, assistant] : quick;
}

export default function HomePage() {
  const services = heroServices();

  return (
    <>
      <SiteHeader className="hero-header" />

      <main className="flex-1">
        {/* ---------------- Bosh ekran (Hero) ---------------- */}
        <section className="hero-premium relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
          <HeroBackdrop />

          <Container className="relative">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="animate-fade-up text-[2.1rem] leading-[1.12] font-semibold tracking-[-0.02em] text-balance sm:text-6xl sm:leading-[1.05]">
                {/*
                  Tire oldingi so'z bilan BIRGA qoladi (`&nbsp;`).
                  Aks holda telefon ekranida yangi qator "—" bilan
                  boshlanardi va sarlavha sinib ko'rinardi.
                */}
                Ovqat, xarid, to&apos;lov va sayohat&nbsp;—{' '}
                <span className="hero-title-accent">bitta ilovada</span>
              </h1>

              <p
                className="animate-fade-up text-muted-foreground mx-auto mt-6 max-w-xl text-base leading-relaxed text-pretty sm:text-lg"
                style={{ animationDelay: '90ms' }}
              >
                Har bir xizmat uchun alohida ilova va alohida hisob kerak emas. Bitta hisob, bitta
                hamyon, buyurtmalar tarixi ham bitta joyda.
              </p>

              {/*
                Tugmalar chuqurlikdan chiqadi — sarlavha va matndan
                keyin. Ketma-ketlik ko'zni yuqoridan pastga olib
                boradi: sarlavha, izoh, keyin amal.
              */}
              <div className="animate-hero-pop mt-9" style={{ animationDelay: '200ms' }}>
                <HeroActions />
              </div>
            </div>

            {/*
              Xizmatlar ro'yxati — bosh ekranning asosiy mazmuni.

              Odam "bu ilova nima qila oladi?" degan savolga javobni
              matndan emas, aynan shu ro'yxatdan oladi. Har biri bosiladi:
              ro'yxat bezak emas, kirish nuqtasi.
            */}
            <ul className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-3 sm:mt-14 sm:grid-cols-4">
              {services.map((module, index) => (
                <li
                  key={module.id}
                  className="animate-fade-up"
                  style={{ animationDelay: `${300 + index * 60}ms` }}
                >
                  <Link
                    href={module.href}
                    className="hero-card flex h-full flex-col items-center gap-2.5 rounded-2xl px-3 py-5 text-center"
                  >
                    <span className="hero-card-icon">
                      <ServiceIcon icon={module.icon} color={module.color} size="sm" />
                    </span>
                    <span className="text-[0.8125rem] leading-tight font-medium sm:text-sm">
                      {module.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        {/* ---------------- Modullar ---------------- */}
        <section id="modullar" className="scroll-mt-24 py-16 sm:py-20">
          <Container>
            {/*
              Sarlavha va'da bermaydi, YO'L KO'RSATADI.

              Ilgari bu yerda "kerak bo'lgan hamma narsa" deb yozilgandi.
              Pastdagi kartalarning bir qismida esa "Rejada" belgisi
              turibdi — ya'ni matn kartalarning o'zi bilan ziddiyatda edi.

              Endi sarlavha shu belgini tushuntiradi: odam qaysi xizmat
              bugun ishlashini bir qarashda ajratadi.
            */}
            <SectionHeading
              eyebrow="Xizmatlar"
              title="Har bir xizmat va uning holati"
              description="Belgi xizmat bugun ishlayotganini yoki hali rejada ekanini ko'rsatadi."
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
              title="Platforma qanday qurilgan"
              description="Quyidagilar hozir kodda bor. Va'da emas — tekshirish mumkin."
            />

            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
