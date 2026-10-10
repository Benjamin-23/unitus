import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Pillars } from "@/components/landing/pillars";
import { LoanCalculator } from "@/components/landing/loan-calculator";
import { Distance } from "@/components/landing/distance";
import { Testimonials } from "@/components/landing/testimonials";
import { Faq } from "@/components/landing/faq";
import { ProductTour } from "@/components/landing/product-tour";
import { TrustSection } from "@/components/landing/trust-section";
import { OffersSection } from "@/components/landing/offers-section";
import { BusinessModel } from "@/components/landing/business-model";
import { Cta, Footer } from "@/components/landing/cta-footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <ProductTour />
        <HowItWorks />
        <Pillars />
        <TrustSection />
        <Distance />
        <LoanCalculator />
        <OffersSection />
        <BusinessModel />
        <Testimonials />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
