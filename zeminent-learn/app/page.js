import { STYLES } from "../components/styles/globalStyles";
import Nav from "../components/sections/Nav";
import Hero from "../components/sections/Hero";
import WhyExists from "../components/sections/WhyExists";
import Curriculum from "../components/sections/Curriculum";
import PlatformPreview from "../components/sections/PlatformPreview";
import Certificate from "../components/sections/Certificate";
import InstructorsCarousel from "../components/sections/InstructorsCarousel";
import Outcomes from "../components/sections/Outcomes";
import Pricing from "../components/sections/Pricing";
import FAQ from "../components/sections/FAQ";
import FinalCTA from "../components/sections/FinalCTA";
import Footer from "../components/Footer";

export default function App() {
  return (
    <>
      <style>{STYLES}</style>
      <div
        style={{ background: "var(--bg)", color: "var(--fg)", overflow: "hidden" }}
        className="font-body"
      >
        <Nav />
        <Hero />
        <WhyExists />
        <Curriculum />
        <PlatformPreview />
        <Certificate />
        <InstructorsCarousel />
        <Outcomes />
        <Pricing />
        <FAQ />
        <FinalCTA />
        <Footer />
      </div>
    </>
  );
}
