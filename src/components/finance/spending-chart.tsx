'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { rampColor } from '@/config/finance';
import { formatTiyin } from '@/lib/money';
import type { SpendingSlice } from '@/modules/finance/finance.types';

/**
 * Xarajatlar diagrammasi — GORIZONTAL ustunlar.
 *
 * ── Nima uchun halqa (donut) emas ─────────────────────────────────────
 * Halqa chiroyli ko'rinadi, lekin uning vazifasi yomon bajariladi:
 * odam ikki bo'lakning qaysi biri kattaroq ekanini burchakka qarab
 * ayta olmaydi. Ustun uzunligini esa bir qarashda solishtiradi.
 *
 * Ustiga, toifa nomlari uzun ("Kommunal to'lovlar") va telefon
 * ekrani tor. Halqada ular yon tomonda alohida ro'yxatda turardi va
 * odam rangni ro'yxat bilan solishtirib chiqishga majbur bo'lardi.
 *
 * Gorizontal ustunda nom ustunning YONIDA turadi — solishtirish
 * kerak emas.
 *
 * ── Nima uchun bitta rangning qadamlari ───────────────────────────────
 * Har toifaga o'z rangi berilsa, bu KATEGORIK bo'yash bo'lardi — u
 * seriyalarni farqlash uchun. Bu yerda esa vazifa boshqa: kattalikni
 * solishtirish. Shuning uchun bitta rang, ko'proq xarajat — to'qroq.
 *
 * Ranglar `globals.css` da CSS o'zgaruvchisi sifatida turadi va
 * mavzu almashtirilganda o'zi qayta bo'yaladi.
 */

/** Bitta ustunning balandligi — PIKSELDA. */
const ROW_HEIGHT = 40;

/** Nom uchun ajratilgan kenglik — PIKSELDA. */
const LABEL_WIDTH = 104;

export interface SpendingChartProps {
  slices: readonly SpendingSlice[];
}

export function SpendingChart({ slices }: SpendingChartProps) {
  if (slices.length === 0) return null;

  const max = Math.max(...slices.map((slice) => slice.amountTiyin));

  /*
    Balandlik qatorlar soniga qarab hisoblanadi.

    Qat'iy balandlik berilsa, ikkita qatorli diagramma bo'sh joyda
    suzib turardi, oltitasi esa siqilib ketardi.
  */
  const height = slices.length * ROW_HEIGHT;

  return (
    <div style={{ height }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={[...slices]}
          layout="vertical"
          margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
          /* Ustunlar orasida 2 piksellik tirqish — chegara chizmaymiz. */
          barCategoryGap={6}
        >
          {/* O'q YASHIRIN: summa har ustunning yonida yozilgan. */}
          <XAxis type="number" hide domain={[0, max]} />

          <YAxis
            type="category"
            dataKey="label"
            width={LABEL_WIDTH}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          />

          <Tooltip
            cursor={{ fill: 'var(--secondary)', opacity: 0.5 }}
            /*
              Qutini O'ZIMIZ chizamiz: recharts standart oq quti
              chizadi va u qorong'i rejimda begona ko'rinardi.
            */
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;

              const slice = payload[0]?.payload as SpendingSlice | undefined;
              if (!slice) return null;

              return (
                <div className="border-border bg-card rounded-xl border px-3 py-2 text-xs shadow-lg">
                  <p className="text-foreground font-medium">{slice.label}</p>
                  <p className="text-muted-foreground mt-0.5">
                    {formatTiyin(slice.amountTiyin)} &middot; {slice.count} ta amal
                  </p>
                </div>
              );
            }}
          />

          <Bar
            dataKey="amountTiyin"
            /* Uchi yumaloq: 4 piksel — ma'lumot tugaydigan chet. */
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          >
            {slices.map((slice) => (
              <Cell key={slice.code} fill={rampColor(slice.amountTiyin, max)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
