import { Link } from "react-router-dom";
import { GraduationCap, BookOpen, ArrowRight } from "lucide-react";
import Layout from "@/components/Layout";

const SmartWBU = () => {
  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">SmartWBU</h1>
          <p className="mt-3 text-muted-foreground">Choose your portal to sign in.</p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          <Link
            to="/portal/login"
            className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-lg"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold text-foreground">Student Portal</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Courses, grades, registration, transcript, ID card and more.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            to="/professor"
            className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-accent/40 hover:shadow-lg"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <BookOpen className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-display text-xl font-semibold text-foreground">Professor Portal</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage classes, attendance, grading, advising and exam schedules.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
              Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default SmartWBU;
