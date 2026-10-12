"use client";
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useT } from "@/lib/i18n/client";
import { GIFTS, type GiftType } from "@/lib/gifts";

// Validated pair (dataviz validator): green/orange pass CVD; orange < 3:1 so bars carry value labels.
const GREEN = "#006939";
const ORANGE = "#D48233";
const AXIS = { fontSize: 11, fill: "#7A7068" };

const tooltipStyle = {
  contentStyle: { borderRadius: 12, border: "1px solid rgba(0,105,57,.15)", fontSize: 12 },
  cursor: { fill: "rgba(0,105,57,.06)" },
};

export function SignupsChart({ data }: { data: { day: string; signups: number }[] }) {
  const { t } = useT();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#EEE6DC" />
        <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={4} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} formatter={(v) => [v, t.admin.signups]} />
        <Bar dataKey="signups" fill={GREEN} radius={[4, 4, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GiftsChart({ data }: { data: { type: string; issued: number; redeemed: number }[] }) {
  const { locale } = useT();
  const rows = data.map((d) => ({ ...d, label: `${GIFTS[d.type as GiftType]?.emoji ?? ""} ${GIFTS[d.type as GiftType]?.short[locale] ?? d.type}` }));
  const issued = locale === "es" ? "Emitidos" : "Issued";
  const redeemed = locale === "es" ? "Canjeados" : "Redeemed";
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, rows.length * 44)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 28, left: 8, bottom: 0 }} barGap={2}>
        <CartesianGrid horizontal={false} stroke="#EEE6DC" />
        <XAxis type="number" allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" width={110} tick={{ ...AXIS, fill: "#4C4C4C" }} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} formatter={(v) => <span style={{ color: "#4C4C4C" }}>{v}</span>} />
        <Bar dataKey="issued" name={issued} fill={GREEN} radius={[0, 4, 4, 0]} maxBarSize={14}>
          <LabelList dataKey="issued" position="right" style={{ fontSize: 11, fill: "#4C4C4C" }} />
        </Bar>
        <Bar dataKey="redeemed" name={redeemed} fill={ORANGE} radius={[0, 4, 4, 0]} maxBarSize={14}>
          <LabelList dataKey="redeemed" position="right" style={{ fontSize: 11, fill: "#4C4C4C" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FrequencyChart({ data }: { data: { bucket: string; customers: number }[] }) {
  const { t } = useT();
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 18, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#EEE6DC" />
        <XAxis dataKey="bucket" tick={AXIS} tickLine={false} axisLine={false} unit={` ${t.admin.visitsAxis}`} />
        <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} formatter={(v) => [v, t.admin.kpiCustomers]} />
        <Bar dataKey="customers" fill={GREEN} radius={[4, 4, 0, 0]} maxBarSize={48}>
          <LabelList dataKey="customers" position="top" style={{ fontSize: 11, fill: "#4C4C4C" }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
