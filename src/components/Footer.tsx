import { Link } from "react-router-dom";
import { GraduationCap, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border bg-primary text-primary-foreground">
    <div className="container py-12 md:py-16">
      <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div>
          <Link to="/" className="mb-4 flex items-center gap-2">
            <GraduationCap className="h-7 w-7" />
            <span className="font-display text-xl font-bold">
              Akademia<span className="text-accent">.</span>
            </span>
          </Link>
          <p className="text-sm leading-relaxed opacity-80">
            Empowering minds, shaping futures. A leading institution committed to academic excellence, innovation, and community impact since 1998.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="mb-4 font-display text-lg font-semibold">Quick Links</h4>
          <ul className="space-y-2 text-sm opacity-80">
            {[
              { to: "/about", label: "About Us" },
              { to: "/programs", label: "Programs" },
              { to: "/admissions", label: "Admissions" },
              { to: "/news", label: "News & Events" },
              { to: "/contact", label: "Contact" },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="transition-opacity hover:opacity-100">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Programs */}
        <div>
          <h4 className="mb-4 font-display text-lg font-semibold">Faculties</h4>
          <ul className="space-y-2 text-sm opacity-80">
            <li>Faculty of Engineering</li>
            <li>Faculty of Economics</li>
            <li>Faculty of Law</li>
            <li>Faculty of Medicine</li>
            <li>Faculty of Arts & Sciences</li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="mb-4 font-display text-lg font-semibold">Contact</h4>
          <ul className="space-y-3 text-sm opacity-80">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>123 University Boulevard, Tirana, Albania</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" />
              <span>+355 4 123 4567</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" />
              <span>info@akademia.edu</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-10 border-t border-primary-foreground/20 pt-6 text-center text-sm opacity-60">
        © {new Date().getFullYear()} Akademia University. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
