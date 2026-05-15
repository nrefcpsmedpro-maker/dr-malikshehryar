import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookMarked,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  LineChart,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Users,
  Video,
} from "lucide-react";
import { submitMarketingLead } from "@/app/actions/marketing";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/lms/StatusBadge";

const doctorImage = "/dr-malik-shehryar.jpg";
const heroImage = doctorImage;
const mentorImage = doctorImage;
const lectureImage =
  "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=85";
const classroomImage =
  "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?auto=format&fit=crop&w=1200&q=85";
const examPracticeImage =
  "https://images.unsplash.com/photo-1581056771107-24ca5f033842?auto=format&fit=crop&w=1200&q=85";

const navLinks = [
  ["Packages", "#packages"],
  ["Demo Videos", "#demo"],
  ["About", "#about"],
  ["Why Us", "#why-us"],
  ["FAQs", "#faqs"],
  ["Contact", "#contact"],
] as const;

const examTracks = [
  "FCPS-1",
  "MD/MS",
  "NRE-1",
  "NRE-2",
  "USMLE",
  "PLAB",
  "UKMLA",
  "HAAD",
  "MOH",
  "NEET PG",
] as const;

const quickActions = [
  {
    title: "Free Demo Lectures",
    description: "Preview the teaching style before requesting access.",
    href: "#demo",
    icon: PlayCircle,
  },
  {
    title: "Course Packages",
    description: "Choose structured plans for exam-focused preparation.",
    href: "#packages",
    icon: BookMarked,
  },
  {
    title: "Mock Exam Engine",
    description: "Practice timed MCQs with review and score breakdowns.",
    href: "#why-us",
    icon: ClipboardCheck,
  },
  {
    title: "Online Support",
    description: "Send your study goal and get onboarding guidance.",
    href: "#contact",
    icon: MessageCircle,
  },
] as const;

const coveredCourses = [
  "First Aid Step 1",
  "First Aid Step 2 CK",
  "BRS Physiology",
  "Pathoma High Yield",
  "Kaplan Surgery",
  "Anatomy Shelf Notes",
  "ENT High Yield",
  "Ophthalmology High Yield",
  "Obstetrics & Gynaecology",
  "FCPS Past Papers",
  "NRE Mock Tests",
  "AMC & PLAB Prep",
  "MRCS Basics",
  "Clinical Pearls",
  "Short Snell Anatomy",
  "General Surgery",
] as const;

const demoLectures = [
  {
    title: "Clinical Medicine Orientation",
    tag: "Free preview",
    image: lectureImage,
  },
  {
    title: "High-Yield Anatomy Session",
    tag: "Demo lecture",
    image: classroomImage,
  },
  {
    title: "Timed MCQ Walkthrough",
    tag: "Exam practice",
    image: examPracticeImage,
  },
] as const;

const packages = [
  {
    title: "Foundation Access",
    detail: "For students starting structured medical revision.",
    items: ["Core lecture library", "Guided curriculum", "Student dashboard"],
    tone: "border-sky-200 bg-sky-50 text-sky-700",
  },
  {
    title: "Exam Prep Access",
    detail: "For focused FCPS, NRE, USMLE, PLAB, and licensing preparation.",
    items: ["Mock exams", "Course tests", "Score breakdowns"],
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    title: "Academy Complete",
    detail: "For learners who want lectures, tests, progress, and certificates.",
    items: ["Protected videos", "Progress tracking", "Certificates"],
    tone: "border-amber-200 bg-amber-50 text-amber-700",
  },
] as const;

const metrics = [
  ["20+", "Medical books and modules"],
  ["24/7", "Lecture access after approval"],
  ["90%", "Exam-focused practice target"],
  ["1", "Unified LMS workspace"],
] as const;

const whyUs = [
  {
    title: "Urdu/Hindi-friendly medical lectures",
    description: "A familiar explanation style for students who want complex subjects made practical.",
    icon: Video,
  },
  {
    title: "Locked, protected course delivery",
    description: "Students see the full pathway while access stays controlled by enrollments and approvals.",
    icon: ShieldCheck,
  },
  {
    title: "Practice built into the learning path",
    description: "Course tests and standalone exams help students study, attempt, review, and improve.",
    icon: ClipboardCheck,
  },
  {
    title: "Professional academy operations",
    description: "Admins can manage courses, students, tests, analytics, leads, and certificates cleanly.",
    icon: LineChart,
  },
] as const;

const testimonials = [
  {
    quote: "The structured lessons helped me revise medical subjects without wasting time searching for resources.",
    name: "Dr. Ayesha Khan",
    role: "NRE candidate",
  },
  {
    quote: "Timed questions and review screens made the exam practice feel focused and measurable.",
    name: "Dr. Hamza Ali",
    role: "FCPS preparation",
  },
  {
    quote: "The platform feels like a serious study environment, not a scattered video folder.",
    name: "Dr. Sara Malik",
    role: "Clinical learner",
  },
] as const;

const faqs = [
  {
    question: "How do students get access?",
    answer: "Students request an account, then an administrator approves access before protected LMS content opens.",
  },
  {
    question: "Are lectures available at fixed times?",
    answer: "Lectures are prerecorded, so approved students can continue learning according to their own study schedule.",
  },
  {
    question: "Can students practice exams inside the LMS?",
    answer: "Yes. The LMS supports course tests, standalone exams, timed attempts, score review, and result summaries.",
  },
  {
    question: "Does the platform support certificates?",
    answer: "Yes. Certificates can be issued from the LMS when course completion criteria are met.",
  },
] as const;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const { lead } = await searchParams;

  return (
    <main className="bg-background text-foreground">
      <header className="relative z-30 border-b bg-white">
        <div className="border-b bg-slate-950 text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-2 text-xs font-medium sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-white/80">
              <span className="inline-flex items-center gap-2">
                <Phone size={14} className="text-emerald-300" />
                +92 300 0000000
              </span>
              <span className="inline-flex items-center gap-2">
                <Mail size={14} className="text-amber-300" />
                admissions@medpro.example
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="#contact" className="text-white/80 hover:text-white">
                Request guidance
              </Link>
              <Link href="/login" className="font-semibold text-white hover:text-emerald-200">
                Login
              </Link>
            </div>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap size={24} />
            </span>
            <span>
              <span className="block text-base font-bold leading-tight">Dr. Malik Shehryar</span>
              <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-primary">Medical Academy</span>
            </span>
          </Link>
          <div className="hidden items-center gap-6 lg:flex">
            {navLinks.map(([label, href]) => (
              <Link key={label} href={href} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
                {label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href="#demo">Free demo</Link>
            </Button>
            <Button asChild>
              <Link href="/login">Register</Link>
            </Button>
          </div>
        </nav>
      </header>

      <section className="relative overflow-hidden bg-white">
        <div className="mx-auto grid min-h-[calc(100svh-112px)] max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
          <div className="relative z-10 max-w-3xl">
            <StatusBadge variant="info">Pakistan-focused medical exam LMS</StatusBadge>
            <h1 className="mt-6 text-4xl font-bold leading-[1.03] tracking-tight text-slate-950 sm:text-5xl md:text-6xl">
              Prepare for medical exams with lectures, MCQs, progress, and expert guidance.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              A professional academy platform for FCPS, NRE, USMLE, PLAB, UKMLA, HAAD, MOH,
              and core medical subject preparation with protected LMS access.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {examTracks.map((track) => (
                <span key={track} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                  {track}
                </span>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-7">
                <Link href="/login">
                  Login to LMS <ArrowRight size={18} className="ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 border-slate-300 bg-white px-7">
                <Link href="#contact">
                  Register New User <ClipboardCheck size={18} className="ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="h-12 px-7">
                <Link href="#demo">
                  Free Demo Lectures <PlayCircle size={18} className="ml-2" />
                </Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ["Approved access", ShieldCheck],
                ["Protected videos", Video],
                ["Timed exams", Clock3],
              ].map(([label, Icon]) => (
                <div key={label as string} className="flex items-center gap-3 rounded-lg border bg-white p-3 shadow-sm">
                  <Icon size={18} className="text-primary" />
                  <span className="text-sm font-semibold text-slate-700">{label as string}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative z-10 space-y-4 lg:pl-6">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-white shadow-sm lg:aspect-[4/5]">
              <Image
                src={heroImage}
                alt="Dr. Malik Shehryar"
                fill
                loading="eager"
                sizes="(min-width: 1024px) 43vw, 100vw"
                className="object-contain object-center"
              />
            </div>
            <div className="rounded-lg border bg-card p-5 shadow-sm">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary">Online support</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="text-2xl font-bold text-slate-950">Start with the right exam path.</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Share your target exam and the academy team can guide you toward the right course access.
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4 text-emerald-800">
                  <MessageCircle size={22} />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em]">WhatsApp guidance</p>
                    <p className="font-bold">+92 300 0000000</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-secondary/45 py-8">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="group rounded-lg border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <Icon size={24} className="text-primary" />
                <h2 className="mt-4 text-lg font-bold">{action.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section id="about" className="bg-white py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
                <Image
                  src={mentorImage}
                  alt="Dr. Malik Shehryar"
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="bg-white object-contain object-center"
                />
              </div>
            <div className="absolute bottom-5 left-5 right-5 rounded-lg border bg-white/94 p-5 shadow-lg backdrop-blur">
              <p className="text-sm font-bold text-primary">Dr. Malik Shehryar</p>
              <p className="mt-1 text-sm text-muted-foreground">Medical educator and academy lead</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">About the academy</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">
              Medical lectures made organized, accessible, and exam focused.
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Students get a clearer pathway from discovery to registration, demo lectures, course
              packages, mock exams, and protected LMS access.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                "Complete learning pathways instead of scattered files",
                "Admin approval keeps academy content controlled",
                "Progress and certificates make outcomes visible",
                "Exam engines support timed medical MCQ practice",
              ].map((item) => (
                <div key={item} className="flex gap-3 rounded-lg border bg-card p-4">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                  <p className="text-sm font-semibold leading-6">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-16 text-white">
        <div className="mx-auto max-w-7xl px-5">
          <div className="grid gap-4 md:grid-cols-4">
            {metrics.map(([value, label]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/10 p-6">
                <p className="text-4xl font-bold text-emerald-300">{value}</p>
                <p className="mt-2 text-sm font-medium text-white/75">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Course coverage</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">
                Video lectures across the subjects students actually search for.
              </h2>
            </div>
            <p className="text-lg leading-8 text-muted-foreground">
              Students can browse the major preparation areas quickly, then request the right access
              path for their exam goal.
            </p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {coveredCourses.map((course) => (
              <div key={course} className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-sm">
                <BookOpen size={18} className="shrink-0 text-primary" />
                <span className="text-sm font-semibold">{course}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="border-y bg-white py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Trial videos</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">
                Free demo lectures before full access.
              </h2>
            </div>
            <Button asChild variant="outline">
              <Link href="#contact">
                Request trial guidance <ArrowRight size={17} className="ml-2" />
              </Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {demoLectures.map((demo) => (
              <div key={demo.title} className="overflow-hidden rounded-lg border bg-card shadow-sm">
                <div className="relative aspect-video">
                  <Image src={demo.image} alt={demo.title} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
                  <div className="absolute inset-0 bg-slate-950/20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary shadow-lg">
                      <PlayCircle size={30} />
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <StatusBadge variant="warning">{demo.tag}</StatusBadge>
                  <h3 className="mt-3 text-lg font-bold">{demo.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Preview how lessons are structured inside the medical academy LMS.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="packages" className="bg-secondary/45 py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Our packages</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">
              Simple access paths for serious medical preparation.
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Choose the learning path that fits your preparation stage and request guided onboarding.
            </p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {packages.map((plan) => (
              <div key={plan.title} className="rounded-lg border bg-card p-6 shadow-sm">
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${plan.tone}`}>Medical LMS plan</span>
                <h3 className="mt-5 text-2xl font-bold">{plan.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.detail}</p>
                <div className="mt-6 space-y-3">
                  {plan.items.map((item) => (
                    <div key={item} className="flex items-center gap-3 text-sm font-semibold">
                      <CheckCircle2 size={17} className="text-emerald-600" />
                      {item}
                    </div>
                  ))}
                </div>
                <Button asChild className="mt-7 w-full">
                  <Link href="#contact">View package guidance</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="why-us" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Why us</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">
                Built like a modern LMS, presented like a trusted medical academy.
              </h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                Students can understand the offer quickly, preview the learning style, and move into
                protected course access with confidence.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {whyUs.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-lg border bg-card p-5 shadow-sm">
                    <Icon size={23} className="text-primary" />
                    <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-20 text-white">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-300">Testimonials</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
              What students should feel when they land here.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/72">
              Student feedback highlights structure, focused revision, and measurable exam practice.
            </p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="rounded-lg border border-white/10 bg-white/10 p-6">
                <div className="flex gap-1 text-amber-300">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={16} fill="currentColor" />
                  ))}
                </div>
                <p className="mt-5 text-sm leading-7 text-white/80">{testimonial.quote}</p>
                <div className="mt-6 border-t border-white/10 pt-4">
                  <p className="font-bold">{testimonial.name}</p>
                  <p className="text-sm text-white/60">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faqs" className="bg-background py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">FAQs</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">
              Clear answers before students register.
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              These answer the high-intent questions that usually appear on medical prep pages.
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-lg border bg-card p-5 shadow-sm">
                <h3 className="text-lg font-bold">{faq.question}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="bg-white py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Register new user</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">
              Tell us your exam goal and request LMS access.
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Use this form for course access, trial guidance, collaboration, or academy onboarding.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                ["Clinical courses", Stethoscope],
                ["Student management", Users],
                ["Exam analytics", LineChart],
                ["Certificates", Award],
              ].map(([label, Icon]) => (
                <div key={label as string} className="flex items-center gap-3 rounded-lg border bg-card p-4">
                  <Icon size={19} className="text-primary" />
                  <span className="text-sm font-bold">{label as string}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm">
            {lead === "thanks" && (
              <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                Thank you. Your request has been received.
              </div>
            )}
            {(lead === "missing" || lead === "error") && (
              <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                {lead === "missing" ? "Please complete the required fields." : "The request could not be saved. Please try again."}
              </div>
            )}
            <form action={submitMarketingLead} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="name">Full name</label>
                  <input id="name" name="name" required className="h-11 w-full rounded-md border bg-background px-3 text-sm" placeholder="Dr. Sarah Ahmed" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" required className="h-11 w-full rounded-md border bg-background px-3 text-sm" placeholder="you@example.com" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="phone">Phone</label>
                  <input id="phone" name="phone" className="h-11 w-full rounded-md border bg-background px-3 text-sm" placeholder="+92..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="goal">Interest</label>
                  <select id="goal" name="goal" required className="h-11 w-full rounded-md border bg-background px-3 text-sm">
                    <option value="">Select an option</option>
                    <option value="student_access">Student course access</option>
                    <option value="exam_prep">Mock exam preparation</option>
                    <option value="academy_admin">Academy administration</option>
                    <option value="partnership">Partnership</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="message">Message</label>
                <textarea id="message" name="message" rows={4} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Tell us what you want to study or manage." />
              </div>
              <Button type="submit" size="lg" className="h-12 w-full">
                Submit request <ArrowRight size={18} className="ml-2" />
              </Button>
            </form>
          </div>
        </div>
      </section>

      <footer className="border-t bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-primary">
                <GraduationCap size={24} />
              </span>
              <div>
                <p className="font-bold">Dr. Malik Shehryar Medical Academy</p>
                <p className="text-sm text-white/60">Professional medical LMS</p>
              </div>
            </div>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/70">
              A polished public academy site connected to a protected LMS for lectures, exams,
              progress, certificates, and administrator workflows.
            </p>
          </div>
          <div>
            <h3 className="font-bold">Online platform</h3>
            <div className="mt-4 grid gap-2 text-sm text-white/70">
              <Link href="/login" className="hover:text-white">Log in</Link>
              <Link href="#packages" className="hover:text-white">Packages</Link>
              <Link href="#demo" className="hover:text-white">Demo videos</Link>
              <Link href="#faqs" className="hover:text-white">FAQs</Link>
            </div>
          </div>
          <div>
            <h3 className="font-bold">Contact</h3>
            <div className="mt-4 space-y-3 text-sm text-white/70">
              <p className="flex items-center gap-2">
                <MapPin size={15} className="text-emerald-300" />
                Lahore, Pakistan
              </p>
              <p className="flex items-center gap-2">
                <Phone size={15} className="text-emerald-300" />
                +92 300 0000000
              </p>
              <p className="flex items-center gap-2">
                <Sparkles size={15} className="text-amber-300" />
                Exam-focused medical academy
              </p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-white/50">
          Copyright 2026. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
