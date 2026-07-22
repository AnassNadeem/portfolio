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
  role: "Software Engineer · AI & Full-Stack",
  roles: [
    "Machine Learning Engineer",
    "Software Engineer",
    "AI Systems Builder",
    "Full-Stack Developer",
  ],
  tagline:
    "I ship fast, build with AI daily, and finish projects to the last detail.",
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
    "Computer Science student at Brunel University London. I build full-stack apps, AI agents, and automation with Python and TypeScript, taking projects from idea to working prototype on my own.",
    "Outside class I build open-source Formula 1 data tools and physics-informed ML. Long term I want to work in F1 software and strategy analytics.",
  ],
  offTheRadio: [
    "When I'm not building, I'm probably watching F1. Race weekends basically take over my schedule.",
    "I go to a lot of hackathons and meetups around London too. It's where most of my best project ideas come from.",
    "Hit me up if you wanna watch an F1 race together, or grab a coffee if you're around London.",
  ],
  topLanguages: ["PYTHON", "JAVA", "TYPESCRIPT"],
  radar: [
    { axis: "FRONTEND", value: 88 },
    { axis: "BACKEND", value: 84 },
    { axis: "AI / DATA", value: 93 },
    { axis: "AUTOMATION", value: 90 },
    { axis: "SIMULATIONS", value: 72 },
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
    seasons: "JUL 2026 / NOW",
    role: "Student Ambassador",
    company: "Brunel University London",
    type: "Outreach & Recruitment",
    points: [
      "Represent the university at open days and recruitment events with prospective students and parents.",
      "Deliver campus tours and Q&A sessions, turning dense info into clear messaging.",
      "Create and share content to promote events and grow applicant engagement.",
    ],
    stack: ["Public Speaking", "Content", "Communication"],
  },
  {
    position: "🏆",
    seasons: "MAY 2026",
    role: "1st Place · Oxford Physical AI Hackathon",
    company: "Oxford Artificial Intelligence Society",
    type: "30-Hour Hackathon · Imitation Learning / VLA Track",
    points: [
      "Won 1st place in the Imitation Learning / VLA track. Only team to finish the hardware setup.",
      "Assembled and programmed a Pollen Robotics Amazing Hand (8 servo motors) from scratch.",
      "Built a webcam teleoperation system for real-time hand mirroring with computer vision.",
    ],
    stack: ["Python", "Computer Vision", "Robotics", "Servo Control"],
  },
  {
    position: "P2",
    seasons: "JAN / MAR 2026",
    role: "Student Leader",
    company: "Electech",
    type: "STEM Education Programme",
    points: [
      "Coordinated STEM sessions for groups of 15+ (scheduling, materials, logistics).",
      "Produced and edited short-form Instagram video to grow engagement.",
    ],
    stack: ["STEM Education", "Leadership", "Content Production"],
  },
  {
    position: "P3",
    seasons: "SEP 2025 / NOW",
    role: "BSc (Hons) Computer Science",
    company: "Brunel University London",
    type: "Education · With Work Placement",
    points: [
      "Modules: Programming Applications, Data & Information, Logic & Computation, OOP, Information Systems, Group Project.",
      "Built a full-stack desktop e-commerce app in a team of 7. Owned the storefront and a live finance dashboard.",
    ],
    stack: ["Java", "Python", "SQL", "System Design"],
  },
  {
    position: "P4",
    seasons: "JUL / AUG 2024",
    role: "PHP Intern",
    company: "TallyMarks Consulting",
    type: "Web Development",
    points: [
      "Built and tested web apps with PHP and HTML.",
      "Wrote and optimised SQL queries for data retrieval and storage.",
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
      "Used Perspective to generate live graphs for real-time data monitoring.",
      "Fixed broken repository files and contributed patches to the codebase.",
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
  /** Published paper / write-up link — renders a "PAPER ↗" pill when set. */
  paper?: string;
  /** Cover image shown in the pit-wall monitor. Drop a real file in
   *  public/projects/ (keep the same name) or point this at any path/URL.
   *  When omitted, the procedural circuit art is shown instead. */
  image?: string;
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
      "Always-on Race Intelligence System. ML pipeline that ingests racing telemetry and surfaces strategy signals in real time.",
    stack: ["Python", "Jupyter", "ML", "Telemetry"],
    github: "https://github.com/AnassNadeem/ARIS",
    image: "/projects/aris.png",
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
      "AI job-hunting tool. Finds London roles, rewrites your CV to fit each one, and applies for you.",
    stack: ["TypeScript", "AI Agents", "Automation"],
    github: "https://github.com/AnassNadeem/ApplyPilot",
    image: "/projects/applypilot.png",
    trackId: 1,
    status: "IN PRODUCTION",
  },
  {
    round: "R3",
    name: "Raez Commerce",
    repo: "AnassNadeem/raez-ecommerce-app",
    year: "2026",
    description:
      "University team project (7 devs). Native JavaFX 21 desktop e-commerce. Owned the storefront and a live finance dashboard. Ships as a native .exe.",
    stack: ["Java", "JavaFX 21", "SQLite", "JUnit 5"],
    github: "https://github.com/AnassNadeem/raez-ecommerce-app",
    live: "https://github.com/AnassNadeem/raez-ecommerce-app/releases/latest",
    image: "/projects/raez.png",
    trackId: 2,
    status: "v1 RELEASED",
  },
  {
    round: "R4",
    name: "BoxBox",
    repo: "AnassNadeem/BoxBox",
    year: "2026",
    description:
      "F1 telemetry build with a published paper on the approach and results.",
    stack: ["Python", "ML", "Telemetry", "Research"],
    github: "https://github.com/AnassNadeem/BoxBox",
    paper: "https://github.com/AnassNadeem/BoxBox", // TODO: replace with the real published-paper URL
    image: "/projects/boxbox.png",
    trackId: 5,
    status: "PAPER PUBLISHED",
  },
  {
    round: "R5",
    name: "This Portfolio",
    year: "2026",
    description:
      "This site. Procedural 3D F1 car, scroll-driven racing line, exploded garage, engine audio, playable arcade.",
    stack: ["React", "Three.js", "GSAP", "Framer Motion", "Vite"],
    github: "https://github.com/AnassNadeem",
    image: "/projects/portfolio.png",
    trackId: 0,
    status: "YOU ARE HERE",
  },
  {
    round: "R6",
    name: "News Sentiment",
    repo: "AnassNadeem/news-sentiment-reporter",
    year: "2025",
    description:
      "Python NLP pipeline that scrapes RSS headlines, scores sentiment with TextBlob, and writes CSV charts.",
    stack: ["Python", "TextBlob", "RSS", "Matplotlib"],
    github: "https://github.com/AnassNadeem/news-sentiment-reporter",
    image: "/projects/news-sentiment.png",
    trackId: 3,
    status: "STABLE",
  },
  {
    round: "R7",
    name: "Lead Machine",
    repo: "AnassNadeem/lead-machine-realestate",
    year: "2026",
    description:
      "Real-estate lead gen funnel with a capture pipeline. Freelance client work.",
    stack: ["HTML/CSS", "JavaScript", "Funnels"],
    github: "https://github.com/AnassNadeem/lead-machine-realestate",
    image: "/projects/lead-machine.png",
    trackId: 4,
    status: "CLIENT WORK",
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
    desc: "First contact with the airflow. Where users hit the product.",
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
    desc: "Nothing ships without protection.",
    tools: ["Type Safety", "Validation", "Code Review", "Git Discipline"],
    offset: [0.1, 1.25, 0],
    anchor: [0.55, 1.1, 0],
  },
  {
    id: "sidepods",
    part: "SIDEPODS",
    domain: "APIs & SERVICES",
    desc: "Where the flow gets routed. Requests in, responses out.",
    tools: ["FastAPI", "REST APIs", "Webhooks", "PostgreSQL", "OpenF1"],
    offset: [0, 0, 0],
    anchor: [-0.3, 0.6, 1.1],
  },
  {
    id: "power",
    part: "POWER UNIT",
    domain: "AI & DATA",
    desc: "Agents, models, pipelines. Throughput is the torque.",
    tools: ["Claude API", "OpenAI API", "OpenRouter", "AI Agents", "NLP", "Pandas / NumPy"],
    offset: [-0.5, 0.95, 0],
    anchor: [-0.8, 1.0, 0],
  },
  {
    id: "floor",
    part: "FLOOR",
    domain: "AUTOMATION & TOOLING",
    desc: "Hard to see from the stands. Does most of the work.",
    tools: ["Git/GitHub", "Docker", "Cloudflare", "Zapier", "Make", "n8n", "GoHighLevel"],
    offset: [0.1, -0.85, 0],
    anchor: [0.1, -0.4, 0.8],
  },
  {
    id: "rearwing",
    part: "REAR WING · DRS",
    domain: "SHIPPING & DELIVERY",
    desc: "Open the flap, ship faster. Idea to prototype in a weekend.",
    tools: ["30h Hackathons", "Releases", "Prompt Engineering"],
    offset: [-1.8, 0.4, 0],
    anchor: [-2.4, 1.3, 0],
  },
  {
    id: "wheels",
    part: "WHEELS",
    domain: "SHIPPED PRODUCT",
    desc: "Where all of it meets the road.",
    tools: ["15+ public repos", "1st place · Oxford AI"],
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
  gridrun: [
    { name: "APX", ms: 528000 }, // ~7,200 pts — the house ghost, hard to beat
    { name: "VER", ms: 543000 }, // ~5,700 pts
    { name: "LEC", ms: 558000 }, // ~4,200 pts
    { name: "NOR", ms: 571000 }, // ~2,900 pts
    { name: "HAM", ms: 585000 }, // ~1,500 pts — beatable in a first clean run
  ],
};

/** hot-lap tour captions, keyed by scroll progress */
export const TOUR_CAPTIONS: { at: number; text: string }[] = [
  { at: 0.0, text: "LIGHTS OUT. Anas Nadeem. Software engineer who ships fast." },
  { at: 0.1, text: "SECTOR 01. The driver. Brunel CS, Oxford Physical AI hackathon winner." },
  { at: 0.24, text: "SECTOR 02. The garage. Every part maps to a real skill." },
  { at: 0.42, text: "SECTOR 03. Race history. JP Morgan, TallyMarks, Brunel, a P1 trophy." },
  { at: 0.58, text: "SECTOR 04. The pit wall. Real GitHub projects." },
  { at: 0.76, text: "SECTOR 05. The toolkit. Python, TypeScript, React, AI agents." },
  { at: 0.9, text: "FINAL SECTOR. Box box. anass.nadeem42@gmail.com" },
];
