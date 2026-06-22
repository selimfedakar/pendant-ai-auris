import Hero from "@/components/sections/Hero";
import ProductShowcase from "@/components/sections/ProductShowcase";
import TwoModes from "@/components/sections/TwoModes";
import Features from "@/components/sections/Features";
import Pipeline from "@/components/sections/Pipeline";
import Faq from "@/components/sections/Faq";
import ReserveCta from "@/components/sections/ReserveCta";

export default function Home() {
  return (
    <main>
      <Hero />
      <ProductShowcase />
      <TwoModes />
      <Features />
      <Pipeline />
      <Faq />
      <ReserveCta />
    </main>
  );
}
