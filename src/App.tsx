import { AppProvider } from "./context/AppContext";
import Preloader from "./components/Preloader";
import Cursor from "./components/Cursor";
import Navbar from "./components/Navbar";
import SpeedHUD, { RaceToasts } from "./components/SpeedHUD";
import RaceTimer from "./components/RaceTimer";
import RacingLine from "./components/RacingLine";
import Marquee from "./components/Marquee";
import GameCenter from "./components/GameCenter";
import Podium from "./components/Podium";
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
      <GameCenter />
      <Podium />
      <CommandPalette />
      <HotLapTour />
      <EasterEggs />
      <main id="race-main" style={{ position: "relative" }}>
        <RacingLine />
        <Hero />
        <Marquee
          items={["Full-throttle engineering", "React", "TypeScript", "Python", "Three.js", "AI Agents", "Java", "Performance obsessed"]}
        />
        <About />
        <Garage />
        <Experience />
        <Projects />
        <Skills />
        <Contact />
      </main>
      <Footer />
    </AppProvider>
  );
}
