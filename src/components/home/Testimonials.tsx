import { Star } from "lucide-react";
import HorizontalCarousel from "@/components/common/HorizontalCarousel";

interface Testimonial {
  id: number;
  name: string;
  role: string;
  content: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Sarah Jenkins",
    role: "Fashion Editor",
    content: "The quality and attention to detail in every piece is simply unmatched. These are staples that I'll wear for years.",
    rating: 5,
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Verified Buyer",
    content: "Minimalist perfection. The fit is incredible, and the customer service was surprisingly fast and helpful.",
    rating: 5,
  },
  {
    id: 3,
    name: "Emma Roberts",
    role: "Verified Buyer",
    content: "Finally, an ethical brand that doesn't compromise on modern aesthetics. The new collection is absolutely stunning.",
    rating: 5,
  },
  {
    id: 4,
    name: "David Smith",
    role: "Verified Buyer",
    content: "I've replaced half my wardrobe with their essentials. The premium feel justifies every penny.",
    rating: 5,
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="py-8 sm:py-10 bg-secondary/35 scroll-mt-20 border-y border-border/40">
      <div className="mx-auto max-w-[1728px] 2xl:max-w-[1760px] px-4 sm:px-6 lg:px-8 xl:px-8">
        <div className="text-left mb-6 md:mb-8">
          <h2 className="text-fluid-h2 font-display font-bold uppercase tracking-tight text-foreground mb-1.5">
            WHAT OUR CUSTOMERS SAY
          </h2>
          <p className="section-subtitle mt-1 sm:mt-1.5">
            Real feedback from our retail partners and wholesale buyers
          </p>
        </div>
        
        <HorizontalCarousel trackClassName="gap-3 md:gap-4 pb-4 font-sans pt-1">
          {testimonials.map((testimonial) => (
            <div 
              key={testimonial.id} 
              className="flex flex-col w-[85vw] sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)] shrink-0 snap-start bg-background p-5 md:p-6 rounded-xl transition-all duration-300 hover:-translate-y-1" 
              style={{ boxShadow: "var(--shadow-soft)" }}
            >
              <div className="flex gap-0.5 text-brass-ink mb-3">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} size={14} fill="currentColor" />
                ))}
              </div>
              <p className="text-sm font-sans text-foreground/90 italic flex-grow mb-4 leading-relaxed">&ldquo;{testimonial.content}&rdquo;</p>
              <div className="mt-auto pt-3 border-t border-border/40">
                <p className="text-sm font-sans font-semibold text-foreground">{testimonial.name}</p>
                <p className="text-xs font-sans text-muted-foreground mt-0.5">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </HorizontalCarousel>
      </div>
    </section>
  );
}
