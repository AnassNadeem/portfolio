import { lazy, Suspense } from "react";
import { AppProvider } from "./context/AppContext";
import Preloader from "./components/Preloader";
import Cursor from "./components/Cursor";
import Navbar from "./components/Navbar";
import SpeedHUD, { RaceToasts } from "./components/SpeedHUD";
import RaceTimer from "./components/RaceTimer";
import RacingLine from "./components/RacingLine";
import SectionBridge from "./components/SectionBridge";
import Podium from "./components/Podium";

// Defer all arcade game code until the user opens the game center
const GameCenter = lazy(() => import("./components/GameCenter"));
import CommandPalette from "./components/CommandPalette";
import HotLapTour from "./components/HotLapTour";
import EasterEggs from "./components/EasterEggs";
import Hero from "./components/sections/Hero";
import About from "./components/sections/About";
import Garage from "./components/sections/Garage";
import Experience from "./components/sections/Experience";
import Projects from "./components/sections/Projects";
import Skills from "./components/sections/Skills";
import Contact from "./components/sections/Contact";
import Footer from "./components/sections/Footer";

export default function App() {
  return (
    <AppProvider>
      <Preloader />
      <Cursor />
      <Navbar />
      <SpeedHUD />
      <RaceToasts />
      <RaceTimer />
      <Suspense fallback={null}><GameCenter /></Suspense>
      <Podium />
      <CommandPalette />
      <HotLapTour />
      <EasterEggs />
      <main id="race-main" style={{ position: "relative" }}>
        <RacingLine />
        <Hero />
        <SectionBridge from="00" to="01" variant="carbon" label="LIGHTS OUT" />
        <About />
        <SectionBridge from="01" to="02" variant="beam" label="INTO THE GARAGE" />
        <Garage />
        <SectionBridge from="02" to="03" variant="skid" label="OUT LAP" />
        <Experience />
        <SectionBridge from="03" to="04" variant="telemetry" label="PIT WALL ONLINE" />
        <Projects />
        <SectionBridge from="04" to="05" variant="scan" label="READING TELEMETRY" />
        <Skills />
        <SectionBridge from="05" to="06" variant="pit" label="BOX BOX BOX" />
        <Contact />
      </main>
      <Footer />
    </AppProvider>
  );
}
