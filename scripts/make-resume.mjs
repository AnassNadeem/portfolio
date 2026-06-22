/**
 * Generates public/resume.pdf — a clean one-page placeholder resume that
 * mirrors the placeholder data in src/data/portfolio.ts, so the "View Resume"
 * buttons work immediately. Replace public/resume.pdf with your real resume.
 *
 * Pure Node, zero dependencies: builds a valid PDF with a correct xref table.
 * Regenerate any time with: npm run resume
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "resume.pdf");

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

// ── content stream ──
let y = 752;
const ops = [];
const text = (str, { x = 54, size = 10, bold = false, gap = 16, color = "0 0 0" } = {}) => {
  ops.push(
    `BT /${bold ? "F2" : "F1"} ${size} Tf ${color} rg ${x} ${y} Td (${esc(str)}) Tj ET`
  );
  y -= gap;
};
const rule = () => {
  ops.push(`0.88 0.02 0 RG 1.4 w 54 ${y + 6} m 558 ${y + 6} l S`);
  y -= 14;
};
const heading = (str) => {
  y -= 6;
  text(str, { size: 12, bold: true, gap: 6, color: "0.88 0.02 0" });
  rule();
};

text("ANAS NADEEM", { size: 26, bold: true, gap: 22 });
text("Full-Stack Software Engineer", { size: 12, gap: 16, color: "0.35 0.35 0.38" });
text("anass.nadeem42@gmail.com  |  github.com/AnassNadeem  |  linkedin.com/in/anass-nadeem  |  London, UK", {
  size: 9,
  gap: 14,
  color: "0.35 0.35 0.38",
});
text("PLACEHOLDER RESUME - replace public/resume.pdf with your own. Edit src/data/portfolio.ts to update the site.", {
  size: 8,
  gap: 10,
  color: "0.6 0.6 0.62",
});

heading("PROJECTS");
const job = (role, co, when, bullets) => {
  text(`${role} - ${co}`, { size: 11, bold: true, gap: 13 });
  text(when, { size: 8.5, gap: 13, color: "0.45 0.45 0.48" });
  for (const b of bullets) text(`-  ${b}`, { x: 64, size: 9.5, gap: 13 });
  y -= 4;
};
job("ARIS", "Always-on Race Intelligence System", "2026 | Python, ML", [
  "ML pipeline ingesting racing telemetry and surfacing strategy signals in real time.",
]);
job("ApplyPilot", "AI job-hunting agent", "2026 | TypeScript, AI Agents", [
  "Finds relevant roles, rewrites the CV to fit each one, and applies automatically.",
]);
job("Raez Commerce", "JavaFX 21 desktop e-commerce", "2026 | Java, SQLite, JUnit 5", [
  "Storefront plus 7-module back-office (finance, warehouse, delivery, reviews, orders, admin).",
  "Ships as a native .exe via jpackage; Cloudinary media, BCrypt auth, JUnit-tested.",
]);

heading("EXPERIENCE & EDUCATION");
job("Software Engineer (Independent)", "Freelance", "2024 - Present | London / Remote", [
  "End-to-end client work: scoping, architecture, build, deploy, iterate.",
]);
job("BSc Computer Science", "Brunel University London", "2023 - 2026", [
  "Software engineering, data and AI coursework; 15+ public repos shipped alongside studies.",
]);
job("Python Developer Intern", "CodeAlpha", "2025 | Remote", [
  "Automation tooling and a stock-portfolio tracker, shipped weekly.",
]);

heading("SKILLS");
text("Languages: TypeScript, JavaScript, Python, Java, SQL", { size: 9.5, gap: 13 });
text("Frontend: React, Next.js, Three.js, GSAP, Framer Motion, Vite", { size: 9.5, gap: 13 });
text("Backend, AI & Data: Node.js, FastAPI, PostgreSQL, SQLite, AI agents, scikit-learn, Pandas", { size: 9.5, gap: 13 });

const stream = ops.join("\n");

// ── assemble the PDF with a real xref table ──
const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>",
  `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
];

let pdf = "%PDF-1.4\n";
const offsets = [];
objects.forEach((body, i) => {
  offsets.push(Buffer.byteLength(pdf));
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
});
const xrefStart = Buffer.byteLength(pdf);
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
for (const o of offsets) pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, pdf, "latin1");
console.log(`✓ wrote ${out} (${Buffer.byteLength(pdf)} bytes)`);
