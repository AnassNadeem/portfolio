import { useApp } from "../../context/AppContext";
import { driver, nav } from "../../data/portfolio";
import "./Footer.css";

export default function Footer() {
  const { scrollTo } = useApp();
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-checker" aria-hidden="true" />

      <div className="container footer-grid">
        <div className="footer-brand">
          <div className="footer-logo">
            <span className="footer-plate display">{driver.number}</span>
            <span className="footer-name display">
              {driver.firstName} {driver.lastName}
            </span>
          </div>
          <p className="footer-tag">
            Software engineer building fast, polished products. Currently{" "}
            {driver.available ? "open to new opportunities" : "heads-down shipping"} — the race never stops.
          </p>
          <div className="footer-socials mono">
            <a href={driver.github} target="_blank" rel="noreferrer" data-cursor="link">GITHUB</a>
            <a href={driver.linkedin} target="_blank" rel="noreferrer" data-cursor="link">LINKEDIN</a>
            <a href={`mailto:${driver.email}`} data-cursor="link">EMAIL</a>
          </div>
        </div>

        <div className="footer-col">
          <h4 className="mono footer-col-title">SITEMAP</h4>
          {nav.map((n, i) => (
            <button key={n.id} className="footer-link" onClick={() => scrollTo(`#${n.id}`)} data-cursor="link">
              <span className="mono">0{i + 1}</span> {n.label}
            </button>
          ))}
        </div>

        <div className="footer-col">
          <h4 className="mono footer-col-title">BOX BOX</h4>
          <a className="footer-link" href={`mailto:${driver.email}`} data-cursor="link">Email Me</a>
          <a className="footer-link" href={driver.resume} target="_blank" rel="noreferrer" data-cursor="view">View Resume</a>
          <button className="footer-link" onClick={() => scrollTo("#contact")} data-cursor="link">Contact Form</button>
          <button className="footer-link footer-top" onClick={() => scrollTo(0)} data-cursor="link">
            Back to Grid <span aria-hidden="true">↑</span>
          </button>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container footer-bottom-inner mono">
          <span>© {year} {driver.firstName} {driver.lastName} — ALL RIGHTS RESERVED</span>
          <span className="footer-built">
            BUILT WITH REACT · THREE.JS · GSAP · FRAMER MOTION — DESIGNED FOR SPEED
          </span>
        </div>
      </div>
    </footer>
  );
}
