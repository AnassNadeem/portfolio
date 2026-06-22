/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Single source of truth for ALL site content.
 *  Identity, experience and skills are REAL — sourced from Anas's CV (2026).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const driver = {
  firstName: "ANAS",
  lastName: "NADEEM",
  fullName: "Anas Nadeem",
  initials: "AN",
  number: "42", // race number — from anass.nadeem42
  role: "Software Engineer — AI & Full-Stack",
  tagline:
    "I ship fast and build with AI daily — taking projects from idea to working prototype solo, and finishing them to the last detail.",
  location: "Uxbridge · London, UK",
  email: "anass.nadeem42@gmail.com",
  github: "https://github.com/AnassNadeem",
  githubUser: "AnassNadeem",
  linkedin: "https://www.linkedin.com/in/anass-nadeem/",
  resume: "/resume.pdf", // public/resume.pdf — your real CV
  available: true,
};

/** Optional backends — read from Vite env vars; site works offline when blank.
 *  VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — for Phase 2+ Supabase integration.
 *  VITE_LEADERBOARD_ENDPOINT — legacy fallback endpoint (replaced by Supabase in Phase 4). */
export const FORM_ENDPOINT = import.meta.env.VITE_FORM_ENDPOINT ?? "";
export const LEADERBOARD_ENDPOINT = import.meta.env.VITE_LEADERBOARD_ENDPOINT ?? "";

export const about = {
  paragraphs: [
    "I'm a Computer Science undergraduate at Brunel University London who ships fast and builds with AI daily — full-stack web, AI agents, and workflow automation. First-place winner at the Oxford Physical AI hackathon, where my team was the only one to get the hardware fully running.",
    "I'm comfortable taking a project from idea to working prototype solo — combining Python, TypeScript/React and frontier-model APIs (Anthropic, OpenAI) to build more than should be possible alone. On the side, I work as a freelance automation specialist.",
    "And no, the F1 theme isn't a gimmick — Formula 1 is genuinely how I spend my Sundays. The rest go to hackathons and hardware tinkering.",
  ],
  values: [
    { k: "SHIP ON TUESDAY", v: "Something shipped on a Tuesday should move a real metric by Friday." },
    { k: "AI-NATIVE", v: "Frontier-model APIs are part of the toolbox, not a buzzword." },
    { k: "HIGH OWNERSHIP", v: "Idea → prototype → production. Solo if needed." },
  ],
  stats: [
    { label: "YEARS BUILDING", value: 3, suffix: "+" },
    { label: "PUBLIC REPOS", value: 15, suffix: "+" },
    { label: "HACKATHONS", value: 3, suffix: "+" },
  ],
  radar: [
    { axis: "FRONTEND", value: 88 },
    { axis: "BACKEND", value: 84 },
    { axis: "AI / DATA", value: 93 },
    { axis: "AUTOMATION", value: 90 },
    { axis: "HARDWARE", value: 72 },
  ],
};

export type Experience = {
  position: string;
  seasons: string;
  role: string;
  company: string;
  type: string;
  points: string[];
  stack: string[];
};

/** Real race history — from the CV. */
export const experience: Experience[] = [
  {
    position: "P1",
    seasons: "JUL 2026 — NOW",
    role: "Student Ambassador",
    company: "Brunel University London",
    type: "Outreach & Recruitment",
    points: [
      "Represent the university at open days and recruitment events, engaging directly with prospective students and parents.",
      "Deliver campus tours and Q&A sessions — translating complex information into clear, persuasive messaging.",
      "Create and share content to promote events and boost applicant engagement.",
    ],
    stack: ["Public Speaking", "Content", "Communication"],
  },
  {
    position: "🏆",
    seasons: "MAY 2026",
    role: "1st Place — Oxford Physical AI Hackathon",
    company: "Oxford Artificial Intelligence Society",
    type: "30-Hour Hackathon · Imitation Learning / VLA Track",
    points: [
      "Won 1st place in the Imitation Learning / VLA track — the only team to fully complete the hardware setup.",
      "Assembled and programmed a Pollen Robotics “Amazing Hand” (8 servo motors) from scratch.",
      "Built a webcam-based teleoperation system for real-time hand mirroring using computer vision.",
    ],
    stack: ["Python", "Computer Vision", "Robotics", "Servo Control"],
  },
  {
    position: "P2",
    seasons: "JAN — MAR 2026",
    role: "Student Leader",
    company: "Electech",
    type: "STEM Education Programme",
    points: [
      "Coordinated and delivered structured STEM sessions for groups of 15+ participants — scheduling, materials, logistics.",
      "Produced and edited short-form video content for Instagram to grow engagement.",
    ],
    stack: ["STEM Education", "Leadership", "Content Production"],
  },
  {
    position: "P3",
    seasons: "SEP 2025 — NOW",
    role: "BSc (Hons) Computer Science",
    company: "Brunel University London",
    type: "Education · With Work Placement",
    points: [
      "Key modules: Programming Applications, Data & Information, Logic & Computation, OOP, Information Systems, Group Project (System Design & Implementation).",
      "Built a full-stack desktop e-commerce app in a team of 7 — owned the storefront module and a live-updating finance dashboard.",
    ],
    stack: ["Java", "Python", "SQL", "System Design"],
  },
  {
    position: "P4",
    seasons: "JUL — AUG 2024",
    role: "PHP Intern",
    company: "TallyMarks Consulting",
    type: "Web Development",
    points: [
      "Developed and tested web applications using PHP and HTML.",
      "Authored and optimised SQL queries for data retrieval and storage.",
    ],
    stack: ["PHP", "HTML", "SQL"],
  },
  {
    position: "P5",
    seasons: "MAY 2024",
    role: "Software Engineer (Virtual)",
    company: "JP Morgan Chase & Co.",
    type: "Forage Virtual Internship",
    points: [
      "Used open-source visualisation libraries (Perspective) to generate live graphs for real-time data monitoring.",
      "Resolved broken repository files and contributed fixes to the codebase.",
    ],
    stack: ["Python", "Perspective", "Git"],
  },
];

export type Project = {
  round: string;
  name: string;
  repo?: string;
  year: string;
  description: string;
  stack: string[];
  github?: string;
  live?: string;
  trackId: number;
  featured?: boolean;
  status?: string;
};

export const projects: Project[] = [
  {
    round: "R1",
    name: "ARIS",
    repo: "AnassNadeem/ARIS",
    year: "2026",
    description:
      "Always-on Race Intelligence System — an ML pipeline that ingests racing telemetry and surfaces strategy signals in real time. The pit wall, automated.",
    stack: ["Python", "Jupyter", "ML", "Telemetry"],
    github: "https://github.com/AnassNadeem/ARIS",
    trackId: 0,
    featured: true,
    status: "LIVE FEED",
  },
  {
    round: "R2",
    name: "ApplyPilot",
    repo: "AnassNadeem/ApplyPilot",
    year: "2026",
    description:
      "AI job-hunting mate — finds relevant London roles, rewrites your CV to fit each one, and applies so you don't have to.",
    stack: ["TypeScript", "AI Agents", "Automation"],
    github: "https://github.com/AnassNadeem/ApplyPilot",
    trackId: 1,
    status: "IN PRODUCTION",
  },
  {
    round: "R3",
    name: "Raez Commerce",
    repo: "AnassNadeem/raez-ecommerce-app",
    year: "2026",
    description:
      "University team project (7 devs) — native JavaFX 21 desktop e-commerce. Owned the storefront module and a finance dashboard with live-updating KPIs. Ships as a native .exe.",
    stack: ["Java", "JavaFX 21", "SQLite", "JUnit 5"],
    github: "https://github.com/AnassNadeem/raez-ecommerce-app",
    live: "https://github.com/AnassNadeem/raez-ecommerce-app/releases/latest",
    trackId: 2,
    status: "v1 RELEASED",
  },
  {
    round: "R4",
    name: "News Sentiment",
    repo: "AnassNadeem/news-sentiment-reporter",
    year: "2025",
    description:
      "Python NLP pipeline that scrapes RSS headlines, scores sentiment with TextBlob, and renders visual summaries to CSV and charts.",
    stack: ["Python", "TextBlob", "RSS", "Matplotlib"],
    github: "https://github.com/AnassNadeem/news-sentiment-reporter",
    trackId: 3,
    status: "STABLE",
  },
  {
    round: "R5",
    name: "Lead Machine",
    repo: "AnassNadeem/lead-machine-realestate",
    year: "2026",
    description:
      "Lead-generation machine for real estate — high-converting landing funnel with a capture pipeline behind it. Freelance client work.",
    stack: ["HTML/CSS", "JavaScript", "Funnels"],
    github: "https://github.com/AnassNadeem/lead-machine-realestate",
    trackId: 4,
    status: "CLIENT WORK",
  },
  {
    round: "R6",
    name: "BoxBox",
    repo: "AnassNadeem/BoxBox",
    year: "2026",
    description:
      "Under wraps — a new F1-flavoured build in active development. Telemetry says: watch this space.",
    stack: ["Classified 🏁"],
    github: "https://github.com/AnassNadeem/BoxBox",
    trackId: 5,
    status: "IN DEVELOPMENT",
  },
  {
    round: "R7",
    name: "This Portfolio",
    year: "2026",
    description:
      "The site you're on — procedural 3D F1 car, scroll-driven racing line, exploded-view garage, synthesized engine audio, playable arcade. Zero image assets.",
    stack: ["React", "Three.js", "GSAP", "Framer Motion", "Vite"],
    github: "https://github.com/AnassNadeem",
    trackId: 0,
    status: "YOU ARE HERE",
  },
];

export const coreSkills = [
  { name: "Python / AI & Data", value: 93 },
  { name: "TypeScript / JavaScript", value: 90 },
  { name: "React / Frontend", value: 88 },
  { name: "AI Agents / LLM APIs", value: 92 },
  { name: "FastAPI / REST / SQL", value: 84 },
  { name: "Java / C", value: 76 },
];

export const skillGroups = [
  { title: "LANGUAGES", items: ["Python", "TypeScript", "JavaScript", "SQL", "Java", "C"] },
  { title: "FRONTEND", items: ["React", "HTML/CSS", "Three.js", "GSAP", "Framer Motion", "Responsive Design", "Vite"] },
  { title: "BACKEND & DATA", items: ["FastAPI", "REST APIs", "Webhooks", "PostgreSQL", "Pandas", "NumPy"] },
  { title: "AI & AUTOMATION", items: ["Claude API", "OpenAI API", "AI Agents", "NLP", "Sentiment Analysis", "Zapier", "Make", "n8n", "GoHighLevel"] },
  { title: "TOOLS & PRACTICES", items: ["Git/GitHub", "Prompt Engineering", "Technical Communication", "Hackathons"] },
];

/** ── EXPLODED-VIEW GARAGE: every car part maps to a skill domain ── */
export type GaragePart = {
  id: string;
  part: string;
  domain: string;
  desc: string;
  tools: string[];
  offset: [number, number, number];
  anchor: [number, number, number];
};

export const garageParts: GaragePart[] = [
  {
    id: "frontwing",
    part: "FRONT WING",
    domain: "FRONTEND",
    desc: "First contact with the airflow. The interface is where users hit the product — it has to be perfect.",
    tools: ["React", "HTML/CSS", "Three.js", "GSAP", "Responsive Design"],
    offset: [1.9, 0.1, 0],
    anchor: [2.5, 0.3, 0],
  },
  {
    id: "nose",
    part: "MONOCOQUE",
    domain: "CORE LANGUAGES",
    desc: "The survival cell. Everything else bolts onto this.",
    tools: ["Python", "TypeScript", "JavaScript", "SQL", "Java", "C"],
    offset: [0.55, 0.25, 0],
    anchor: [1.3, 0.7, 0],
  },
  {
    id: "halo",
    part: "HALO",
    domain: "CODE SAFETY",
    desc: "Mandatory since day one. Nothing ships without protection.",
    tools: ["Type Safety", "Validation", "Code Review", "Git Discipline"],
    offset: [0.1, 1.25, 0],
    anchor: [0.55, 1.1, 0],
  },
  {
    id: "sidepods",
    part: "SIDEPODS",
    domain: "APIs & SERVICES",
    desc: "Where the flow gets routed and cooled — requests in, responses out.",
    tools: ["FastAPI", "REST APIs", "Webhooks", "PostgreSQL"],
    offset: [0, 0, 0],
    anchor: [-0.3, 0.6, 1.1],
  },
  {
    id: "power",
    part: "POWER UNIT",
    domain: "AI & DATA",
    desc: "The power plant. Torque measured in throughput — agents, models, pipelines.",
    tools: ["Claude API", "OpenAI API", "AI Agents", "NLP", "Pandas / NumPy"],
    offset: [-0.5, 0.95, 0],
    anchor: [-0.8, 1.0, 0],
  },
  {
    id: "floor",
    part: "FLOOR",
    domain: "AUTOMATION & TOOLING",
    desc: "Invisible from the grandstand — generates most of the downforce.",
    tools: ["Git/GitHub", "Zapier", "Make", "n8n", "GoHighLevel"],
    offset: [0.1, -0.85, 0],
    anchor: [0.1, -0.4, 0.8],
  },
  {
    id: "rearwing",
    part: "REAR WING · DRS",
    domain: "SHIPPING & DELIVERY",
    desc: "Open the flap, ship faster. Idea to prototype before the weekend's out.",
    tools: ["30h Hackathons", "Releases", "Freelance Delivery", "Prompt Engineering"],
    offset: [-1.8, 0.4, 0],
    anchor: [-2.4, 1.3, 0],
  },
  {
    id: "wheels",
    part: "WHEELS",
    domain: "SHIPPED PRODUCT",
    desc: "Where all of it finally meets the road.",
    tools: ["15+ public repos", "1st place — Oxford AI", "Real client work"],
    offset: [0, 0, 0],
    anchor: [1.78, 0.42, -1.2],
  },
];

export const liveries = [
  { name: "Rosso", hex: "#e10600" },
  { name: "Papaya", hex: "#ff8000" },
  { name: "Petronas", hex: "#27f4d2" },
  { name: "Oracle", hex: "#3671c6" },
];

/** unlocked by finishing a lap or typing the cheat — persisted */
export const GOLD_LIVERY = { name: "Champion Gold", hex: "#d4af37" };

export const nav = [
  { id: "about", label: "About" },
  { id: "garage", label: "Garage" },
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
  { id: "contact", label: "Contact" },
];

/** seeded arcade rivals — clearly labelled as bots in the UI */
export const ARCADE_BOTS = {
  reaction: [
    { name: "APX", ms: 168 },
    { name: "VER", ms: 184 },
    { name: "NOR", ms: 213 },
    { name: "HAM", ms: 241 },
  ],
  pitstop: [
    { name: "RBR", ms: 1820 },
    { name: "FER", ms: 2240 },
    { name: "MCL", ms: 2510 },
  ],
  hotlap: [
    { name: "APX", ms: 38500 },
    { name: "GRD", ms: 54300 },
    { name: "PIT", ms: 76800 },
  ],
};

/** hot-lap tour captions, keyed by scroll progress */
export const TOUR_CAPTIONS: { at: number; text: string }[] = [
  { at: 0.0, text: "LIGHTS OUT — this is Anas Nadeem. Software engineer, AI-native, ships fast." },
  { at: 0.1, text: "SECTOR 01 — the driver. Brunel CS, Oxford Physical AI hackathon winner." },
  { at: 0.24, text: "SECTOR 02 — the garage. Every part of the car maps to a real skill." },
  { at: 0.42, text: "SECTOR 03 — race history. JP Morgan, TallyMarks, Brunel, a P1 trophy." },
  { at: 0.58, text: "SECTOR 04 — the pit wall. Real GitHub projects, live telemetry." },
  { at: 0.76, text: "SECTOR 05 — the toolkit. Python, TypeScript, React, AI agents." },
  { at: 0.9, text: "FINAL SECTOR — box box. The radio is open: anass.nadeem42@gmail.com" },
];
