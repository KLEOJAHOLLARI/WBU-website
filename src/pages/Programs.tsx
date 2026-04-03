import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, ArrowRight, Clock } from "lucide-react";
import Layout from "@/components/Layout";
import PageHero from "@/components/PageHero";
import { programs, faculties, degrees } from "@/data/programs";

const Programs = () => {
  const [search, setSearch] = useState("");
  const [faculty, setFaculty] = useState("");
  const [degree, setDegree] = useState("");

  const filtered = programs.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesFaculty = !faculty || p.faculty === faculty;
    const matchesDegree = !degree || p.degree === degree;
    return matchesSearch && matchesFaculty && matchesDegree;
  });

  return (
    <Layout>
      <PageHero
        title="Study Programs"
        subtitle="Explore over 45 undergraduate, master's, and doctoral programs across five faculties"
      />

      <section className="section-padding">
        <div className="container">
          {/* Filters */}
          <div className="mb-10 flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:p-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search programs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={faculty}
              onChange={(e) => setFaculty(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Faculties</option>
              {faculties.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <select
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Degrees</option>
              {degrees.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Results */}
          {filtered.length === 0 ? (
            <p className="py-20 text-center text-muted-foreground">
              No programs match your search. Try adjusting the filters.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <Link
                    to={`/programs/${p.id}`}
                    className="group flex h-full flex-col rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-foreground">
                        {p.degree}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {p.duration}
                      </span>
                    </div>
                    <h3 className="font-display text-xl font-semibold text-foreground group-hover:text-primary">
                      {p.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">{p.faculty}</p>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {p.description}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Learn more <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default Programs;
