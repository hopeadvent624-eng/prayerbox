import { useState, useEffect } from "react";
import { Settings, WifiOff, Loader2, Smartphone, Phone, Sparkles as SparklesIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  Home,
  Heart,
  Plus,
  Sparkles,
  ChevronRight,
  Share2,
  Lock,
  Check,
  X,
  LogOut,
  HeartHandshake,
  BookOpen,
  HandHeart,
  Send,
  Copy,
  MessageCircle,
  ArrowLeft,
  CheckCircle,
  Users,
  Star,
  User,
  Flame,
  AlertTriangle,
  TrendingUp,
  FileText,
  Filter,
  Search,
} from "lucide-react";
import { api } from "./lib/api";
import type { AuthUser, Category, PrayerRequest, Testimony } from "./lib/api";
// @ts-ignore: Ignore missing type declarations for image import
import prayingHandsLogo from "../imports/Asset_1.png";

// ─── Types ────────────────────────────────────────────────────────────────────

type Screen =
  | "splash"
  | "onboarding"
  | "submit"
  | "success"
  | "share"
  | "pray"
  | "testimonies"
  | "account"
  | "settings"
  | "admin-login"
  | "admin-dashboard";

// ─── Static data ──────────────────────────────────────────────────────────────

const INITIAL_PRAYERS: PrayerRequest[] = [
  { id: 1, name: "Tino", request: "Praying for my O-Level results. I've worked hard and need God's grace.", category: "Studies", prayerCount: 37, approved: true },
  { id: 2, name: "Amanda", request: "My mother is having surgery next week. Please pray for her healing and the doctors.", category: "Health", prayerCount: 24, approved: true, urgent: true },
  { id: 3, name: "Tapiwa", request: "God, please provide school fees for next term. My family is struggling.", category: "Studies", prayerCount: 15, approved: true },
  { id: 4, name: "Ruvimbo", request: "Pray for my family. We are going through a very tough season financially.", category: "Family", prayerCount: 8, approved: true },
  { id: 5, name: "Blessing", request: "I need strength in my ministry. Feeling weary and wondering if I am making a difference.", category: "Ministry", prayerCount: 12, approved: true },
  { id: 6, name: "Chiedza", request: "Seeking God's direction for my future. I have two university offers and don't know which to choose.", category: "Personal", prayerCount: 0, approved: true },
  { id: 7, name: "Tendai", request: "Please pray for my friend who has lost faith.", category: "Ministry", prayerCount: 0, approved: true },
];

const INITIAL_TESTIMONIES: Testimony[] = [
  { id: 1, name: "Blessing", text: "God answered my prayer after exams. I passed everything with distinctions!", category: "Studies", daysAgo: 4, prayerCount: 147, approved: true },
  { id: 2, name: "Amanda", text: "My mother recovered fully from surgery. The doctors said it went better than expected. God is faithful.", category: "Health", daysAgo: 12, prayerCount: 89, approved: true },
  { id: 3, name: "Tapiwa", text: "God provided school fees through a church member I had never met. Completely unexpected.", category: "Family", daysAgo: 23, prayerCount: 63, approved: true },
  { id: 4, name: "Ruvimbo", text: "Our family situation turned around. God restored what was broken.", category: "Family", daysAgo: 31, prayerCount: 42, approved: true },
  { id: 5, name: "Chiedza", text: "I prayed for peace and God gave me far more than I asked for.", category: "Personal", daysAgo: 7, prayerCount: 28, approved: true },
  { id: 6, name: "Farai", text: "My job application was accepted. Been jobless for 8 months. Never stop praying.", category: "Personal", daysAgo: 2, prayerCount: 56, approved: true },
  { id: 7, name: "Natsai", text: "Shared publicly.", category: "Ministry", daysAgo: 1, prayerCount: 0, approved: true },
];

const DAILY_VERSE = {
  reference: "Philippians 4:6",
  text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.",
};

const CATEGORIES: Category[] = ["Personal", "Health", "Family", "Studies", "Ministry", "Other"];

// ─── Streak helpers ───────────────────────────────────────────────────────────

function getStreak(): { count: number; prayedToday: boolean } {
  try {
    const last = localStorage.getItem("ayp_lastPrayer");
    const streak = parseInt(localStorage.getItem("ayp_streak") || "0", 10);
    if (!last) return { count: 0, prayedToday: false };
    const lastDate = new Date(last);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / 86400000);
    if (diffDays === 0) return { count: streak, prayedToday: true };
    if (diffDays === 1) return { count: streak, prayedToday: false };
    return { count: 0, prayedToday: false };
  } catch {
    return { count: 0, prayedToday: false };
  }
}

function recordPrayer() {
  try {
    const { count, prayedToday } = getStreak();
    const newStreak = prayedToday ? count : count + 1;
    localStorage.setItem("ayp_streak", String(newStreak));
    localStorage.setItem("ayp_lastPrayer", new Date().toISOString());
  } catch { /* localStorage unavailable */ }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function PrimaryButton({ children, onClick, disabled, className }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-12 px-8 rounded-xl bg-[#1E3A8A] text-white font-semibold text-sm tracking-wide flex items-center justify-center gap-2 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
      style={{ boxShadow: "0 4px 16px rgba(30,58,138,0.35)" }}
    >
      {children}
    </motion.button>
  );
}

function OutlineButton({ children, onClick, className }: {
  children: React.ReactNode; onClick?: () => void; className?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        "h-12 px-6 rounded-xl border-2 border-[#1E3A8A] text-[#1E3A8A] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#EEF2FF] transition-colors",
        className
      )}
    >
      {children}
    </motion.button>
  );
}

function TextInput({ placeholder, value, onChange, maxLength, type = "text" }: {
  placeholder: string; value: string; onChange: (v: string) => void; maxLength?: number; type?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      className="w-full h-12 px-4 rounded-xl bg-[#F5F6FA] text-[#1E2A4A] placeholder-[#9AA3BC] text-sm outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 transition-all border border-transparent focus:border-[#1E3A8A]/20"
    />
  );
}

function Textarea({ placeholder, value, onChange, maxLength, rows = 5 }: {
  placeholder: string; value: string; onChange: (v: string) => void; maxLength?: number; rows?: number;
}) {
  return (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      rows={rows}
      className="w-full px-4 py-3 rounded-xl bg-[#F5F6FA] text-[#1E2A4A] placeholder-[#9AA3BC] text-sm outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 transition-all resize-none border border-transparent focus:border-[#1E3A8A]/20"
    />
  );
}

// Simple ImageWithFallback component to avoid missing identifier errors
function ImageWithFallback({ src, alt, className }: { src: string; alt?: string; className?: string }) {
  return (
    // use a plain img with a basic onError handler to clear the src if it fails to load
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        const t = e.currentTarget as HTMLImageElement;
        t.onerror = null;
        t.src = "";
      }}
    />
  );
}

// ─── Top Nav ──────────────────────────────────────────────────────────────────

function TopNav({ active, onNavigate, currentUser }: { active: string; onNavigate: (s: Screen) => void; currentUser: AuthUser | null }) {
  const links = [
    { key: "submit", label: "Home", icon: Home, screen: "submit" as Screen },
    { key: "pray", label: "Pray", icon: HandHeart, screen: "pray" as Screen },
    { key: "testimonies", label: "Testimonies", icon: Sparkles, screen: "testimonies" as Screen },
  ];

  return (
    <header className="bg-white border-b border-[#EEF2FF] sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <button onClick={() => onNavigate("splash")} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center overflow-hidden">
            <ImageWithFallback src={prayingHandsLogo} alt="AY Prayerbox logo" className="w-7 h-7 object-contain" />
          </div>
          <span className="font-bold text-[#1E2A4A] text-lg tracking-tight">AY Prayerbox</span>
        </button>

        <nav className="hidden sm:flex items-center gap-1">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <button
                key={l.key}
                onClick={() => onNavigate(l.screen)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5",
                  active === l.key
                    ? "bg-[#EEF2FF] text-[#1E3A8A]"
                    : "text-[#7A85A3] hover:text-[#1E2A4A] hover:bg-[#F5F6FA]"
                )}
              >
                <Icon size={15} />
                {l.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <PrimaryButton onClick={() => onNavigate("submit")} className="hidden sm:flex h-9 px-4 text-xs gap-1.5">
            <Send size={13} /> Submit Prayer
          </PrimaryButton>
          <button
            onClick={() => onNavigate("settings")}
            className="flex items-center gap-1.5 text-[#7A85A3] hover:text-[#1E3A8A] text-xs font-medium transition-colors px-2 py-1.5"
            aria-label="Open settings"
          >
            <Settings size={13} /> Settings
          </button>
          <button
            onClick={() => onNavigate("account")}
            className="flex items-center gap-1.5 text-[#7A85A3] hover:text-[#1E3A8A] text-xs font-medium transition-colors px-2 py-1.5"
          >
            <User size={13} /> {currentUser ? currentUser.name.split(" ")[0] : "Account"}
          </button>
        </div>
      </div>
    </header>
  );
}

// ─── Screen 1: Splash / Hero ──────────────────────────────────────────────────

function SplashScreen({ onStart, onPray, prayers, testimonies }: {
  onStart: () => void;
  onPray: () => void;
  prayers: PrayerRequest[];
  testimonies: Testimony[];
}) {
  const totalPrayers = prayers.reduce((sum, p) => sum + p.prayerCount, 0);
  const approvedTestimonies = testimonies.filter((t) => t.approved);

  const stats = [
    { icon: HandHeart, label: "Prayers Offered", value: totalPrayers.toLocaleString() },
    { icon: Send, label: "Requests Submitted", value: prayers.length.toString() },
    { icon: Sparkles, label: "Testimonies Shared", value: approvedTestimonies.length.toString() },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.7 }}
          className="w-28 h-28 rounded-3xl bg-[#EEF2FF] flex items-center justify-center mx-auto mb-8 p-3"
          style={{ boxShadow: "0 8px 32px rgba(30,58,138,0.18)" }}
        >
          <ImageWithFallback src={prayingHandsLogo} alt="Praying hands" className="w-full h-full object-contain" />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-5xl sm:text-6xl font-bold text-[#1E2A4A] tracking-tight leading-tight mb-4"
        >
          AY Prayerbox
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xl text-[#7A85A3] font-light mb-10 max-w-md mx-auto leading-relaxed"
        >
          Anonymous prayer.<br />Real faith. Real community.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16"
        >
          <PrimaryButton onClick={onStart} className="h-14 px-10 text-base gap-2.5">
            Submit a Prayer <Send size={16} />
          </PrimaryButton>
          <OutlineButton onClick={onPray} className="h-14 px-10 text-base gap-2">
            <HandHeart size={16} /> Pray for Someone
          </OutlineButton>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="grid grid-cols-3 gap-4 max-w-2xl mx-auto"
        >
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-[#F5F6FA] rounded-2xl py-5 px-4 text-center">
                <Icon size={20} className="text-[#1E3A8A] mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-2xl font-bold text-[#1E2A4A]">{s.value}</p>
                <p className="text-[#7A85A3] text-xs mt-0.5">{s.label}</p>
              </div>
            );
          })}
        </motion.div>
      </section>

      {/* How it works */}
      <section className="bg-[#F5F6FA] border-y border-[#EEF2FF]">
        <div className="max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-3 gap-8">
          {[
            { icon: Send, title: "Submit a Prayer", desc: "Share your request anonymously. Only your first name is shown to the community." },
            { icon: HandHeart, title: "Pray for Others", desc: "Browse approved requests and stand in prayer for your brothers and sisters." },
            { icon: Sparkles, title: "Share Testimonies", desc: "Celebrate answered prayers and build faith in the community." },
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="text-center"
              >
                <div
                  className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mx-auto mb-4"
                  style={{ boxShadow: "0 4px 16px rgba(30,58,138,0.1)" }}
                >
                  <Icon size={28} className="text-[#1E3A8A]" strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-[#1E2A4A] mb-2">{f.title}</h3>
                <p className="text-[#7A85A3] text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Recent testimonies */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex items-center gap-2 mb-8">
          <Sparkles size={18} className="text-[#1E3A8A]" />
          <h2 className="text-2xl font-bold text-[#1E2A4A]">Recent Testimonies</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {approvedTestimonies.slice(0, 3).map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white rounded-2xl p-6 border border-[#EEF2FF]"
              style={{ boxShadow: "0 4px 16px rgba(30,58,138,0.06)" }}
            >
              <Star size={14} className="text-[#1E3A8A] mb-3" />
              <p className="text-[#2D3A5E] text-sm leading-relaxed mb-4 line-clamp-3">{t.text}</p>
              <div className="flex items-center justify-between pt-3 border-t border-[#EEF0F8]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                    <span className="text-xs font-bold text-[#1E3A8A]">{t.name[0]}</span>
                  </div>
                  <span className="text-[#1E3A8A] text-xs font-semibold">{t.name}</span>
                </div>
                <span className="text-[#9AA3BC] text-xs">{t.daysAgo}d ago</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#EEF2FF] py-8">
        <div className="max-w-5xl mx-auto px-6 text-center text-[#9AA3BC] text-xs flex items-center justify-center gap-1.5">
          <BookOpen size={12} />
          <span>James 5:16 — "Pray for one another." · Anonymous to public. </span>
        </div>
      </footer>
    </div>
  );
}

// ─── Screen 2: Submit Prayer ──────────────────────────────────────────────────

function OnboardingScreen({ onCreateAccount, onLogin, onSkip }: { onCreateAccount: () => void; onLogin: () => void; onSkip: () => void }) {
  return (
    <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 rounded-3xl bg-[#EEF2FF] flex items-center justify-center mx-auto mb-6 p-3" style={{ boxShadow: "0 12px 32px rgba(30,58,138,0.18)" }}>
          <ImageWithFallback src={prayingHandsLogo} alt="AY Prayerbox logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-3xl font-bold text-[#1E2A4A] mb-2">Welcome to AY Prayerbox</h1>
        <p className="text-[#7A85A3] mb-8">Create an account or sign in to keep using Prayerbox with your profile, prayer sharing, and saved preferences.</p>
        <div className="space-y-3">
          <PrimaryButton onClick={onCreateAccount} className="w-full h-12 gap-2">
            <User size={15} /> Create Account
          </PrimaryButton>
          <OutlineButton onClick={onLogin} className="w-full h-12 gap-2">
            <Lock size={15} /> Login
          </OutlineButton>
          <button onClick={onSkip} className="text-sm text-[#9AA3BC] hover:text-[#1E3A8A] transition-colors">Continue as guest</button>
        </div>
      </div>
    </div>
  );
}

function SplashLoadingScreen({ onFinish }: { onFinish: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onFinish, 1400);
    return () => window.clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <div className="w-24 h-24 rounded-3xl bg-[#EEF2FF] flex items-center justify-center mx-auto mb-6 p-3" style={{ boxShadow: "0 12px 32px rgba(30,58,138,0.18)" }}>
          <ImageWithFallback src={prayingHandsLogo} alt="AY Prayerbox logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-3xl font-bold text-[#1E2A4A] mb-2">AY Prayerbox</h1>
        <p className="text-[#7A85A3] mb-8">Preparing your prayer space...</p>
        <div className="w-full h-2 rounded-full bg-[#EEF2FF] overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 1.3, ease: "easeInOut" }} className="h-full rounded-full bg-[#1E3A8A]" />
        </div>
        <div className="flex items-center justify-center gap-2 mt-4 text-[#7A85A3] text-sm">
          <Loader2 size={16} className="animate-spin" /> Loading your community
        </div>
      </div>
    </div>
  );
}

function OfflineNotice({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
      <WifiOff size={15} /> {message}
    </div>
  );
}

function SettingsScreen({ onBack, onLogout }: { onBack: () => void; onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full rounded-2xl bg-white p-7" style={{ boxShadow: "0 4px 24px rgba(30,58,138,0.08)" }}>
        <div className="flex items-center gap-2 mb-6">
          <Settings size={18} className="text-[#1E3A8A]" />
          <h2 className="text-xl font-bold text-[#1E2A4A]">Settings</h2>
        </div>
        <div className="space-y-3 text-sm text-[#2D3A5E]">
          <div className="rounded-xl bg-[#F5F6FA] p-3">Stay signed in on this device so you can return without re-entering your details.</div>
          <div className="rounded-xl bg-[#F5F6FA] p-3">If you lose internet, Prayerbox will show a clear offline message while keeping the local experience available.</div>
          <div className="rounded-xl bg-[#F5F6FA] p-3">Admins can view the account owner and delete accounts from the Leader Panel.</div>
        </div>
        <div className="mt-6 space-y-3">
          <OutlineButton onClick={onBack} className="w-full h-12 gap-2">
            <ArrowLeft size={14} /> Back
          </OutlineButton>
          <PrimaryButton onClick={onLogout} className="w-full h-12 gap-2">
            <LogOut size={14} /> Sign Out
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function SubmitScreen({ onSubmit, defaultName }: { onSubmit: (name: string, request: string, category: Category) => void; defaultName?: string }) {
  const [name, setName] = useState(defaultName ?? "");
  const [request, setRequest] = useState("");
  const [category, setCategory] = useState<Category>("Personal");
  const canSubmit = name.trim().length > 0 && request.trim().length > 0;

  useEffect(() => {
    setName(defaultName ?? "");
  }, [defaultName]);

  const getShareUrl = () => (typeof window !== "undefined" ? window.location.href : "https://ay-prayerbox.example");

  const copyLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    } catch {
      prompt("Copy this link:", url);
    }
  };

  const shareWhatsApp = () => {
    const url = getShareUrl();
    const text = encodeURIComponent(`Check out AY Prayerbox:\n${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] flex items-center justify-center mx-auto mb-4">
            <Send size={24} className="text-[#1E3A8A]" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold text-[#1E2A4A] mb-2">Submit a Prayer Request</h1>
          <p className="text-[#7A85A3]">First name only. God knows the rest.</p>
        </div>

        <div className="bg-white rounded-2xl p-8 space-y-5" style={{ boxShadow: "0 4px 32px rgba(30,58,138,0.08)" }}>
          <div>
            <label className="block text-sm font-semibold text-[#1E2A4A] mb-2">First Name</label>
            <TextInput placeholder="e.g. Tino" value={name} onChange={setName} maxLength={15} />
            <p className="text-right text-xs text-[#9AA3BC] mt-1">{name.length}/15</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1E2A4A] mb-2">Prayer Request</label>
            <Textarea placeholder="Share what's on your heart..." value={request} onChange={setRequest} maxLength={500} rows={6} />
            <p className="text-right text-xs text-[#9AA3BC] mt-1">{request.length}/500</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1E2A4A] mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full h-12 px-4 rounded-xl bg-[#F5F6FA] text-[#1E2A4A] text-sm outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 appearance-none cursor-pointer border border-transparent"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238A94A6' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 14px center",
              }}
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <PrimaryButton onClick={() => canSubmit && onSubmit(name, request, category)} disabled={!canSubmit} className="w-full h-12 gap-2">
            <Send size={15} /> Send Prayer
          </PrimaryButton>

          <div>
            <p className="text-center text-[#7A85A3] text-sm font-medium mb-3">Share Prayerbox</p>
            <div className="flex gap-3">
              <OutlineButton className="flex-1 gap-2" onClick={copyLink}>
                <Copy size={14} /> Copy Link
              </OutlineButton>
              <OutlineButton className="flex-1 gap-2" onClick={shareWhatsApp}>
                <MessageCircle size={14} /> WhatsApp
              </OutlineButton>
            </div>
          </div>

          <div className="text-center pt-1 space-y-1">
            <p className="text-[#9AA3BC] text-xs flex items-center justify-center gap-1.5">
              <Lock size={11} /> Anonymous to public.
            </p>
            <p className="text-[#9AA3BC] text-xs italic flex items-center justify-center gap-1.5">
              <BookOpen size={11} /> James 5:16
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 3: Success ────────────────────────────────────────────────────────

function SuccessScreen({ onPray }: { onPray: () => void }) {
  const getShareUrl = () => (typeof window !== "undefined" ? window.location.href : "https://ay-prayerbox.example");
  const copyLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    } catch {
      prompt("Copy this link:", url);
    }
  };
  const shareWhatsApp = () => {
    const url = getShareUrl();
    const text = encodeURIComponent(`Check out AY Prayerbox:\n${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.7 }}
          className="w-28 h-28 rounded-3xl bg-[#EEF2FF] flex items-center justify-center mx-auto mb-6 p-3"
          style={{ boxShadow: "0 12px 40px rgba(30,58,138,0.18)" }}
        >
          <ImageWithFallback src={prayingHandsLogo} alt="Praying hands" className="w-full h-full object-contain" />
        </motion.div>

        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={24} className="text-green-500" />
        </div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <h2 className="text-3xl font-bold text-[#1E2A4A] mb-2">Request Sent</h2>
          <p className="text-[#7A85A3] mb-2">Your prayer is safe with God and AY.</p>
          <p className="text-[#9AA3BC] text-sm mb-8">Your prayer request is now live for the community to pray over.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <PrimaryButton onClick={onPray} className="gap-2">
              Pray For Someone <ChevronRight size={18} />
            </PrimaryButton>
            <OutlineButton className="gap-2" onClick={copyLink}>
              <Copy size={14} /> Copy Link
            </OutlineButton>
            <OutlineButton className="gap-2" onClick={shareWhatsApp}>
              <MessageCircle size={14} /> WhatsApp
            </OutlineButton>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function SharePrayerScreen({ prayer, onDone }: { prayer: { name: string; request: string; category: Category } | null; onDone: () => void }) {
  const getShareUrl = () => (typeof window !== "undefined" ? window.location.href : "https://ay-prayerbox.example");
  const buildMessage = () => {
    if (!prayer) return "A prayer request was shared through AY Prayerbox.";
    return `Prayer request from ${prayer.name} (${prayer.category}): ${prayer.request}\n\nOpen AY Prayerbox to pray with them.`;
  };

  const handleShare = async () => {
    const message = buildMessage();
    const url = getShareUrl();

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "AY Prayerbox prayer request",
          text: message,
          url,
        });
        return;
      } catch {
        // fall back below
      }
    }

    const text = encodeURIComponent(`${message}\n\n${url}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const copyLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      alert("Prayer link copied to clipboard!");
    } catch {
      prompt("Copy this link:", url);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full rounded-3xl bg-white p-7" style={{ boxShadow: "0 8px 32px rgba(30,58,138,0.10)" }}>
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#EEF2FF] flex items-center justify-center mx-auto mb-4">
            <Share2 size={24} className="text-[#1E3A8A]" />
          </div>
          <h2 className="text-2xl font-bold text-[#1E2A4A]">Share this prayer</h2>
          <p className="text-[#7A85A3] text-sm mt-2">Send it to your circle the same way you would share something personal and meaningful.</p>
        </div>

        <div className="rounded-2xl border border-[#EEF2FF] bg-[#F5F6FA] p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#1E3A8A]">Prayer preview</span>
            <span className="rounded-full bg-[#EEF2FF] px-2.5 py-1 text-[11px] font-semibold text-[#1E3A8A]">{prayer?.category || "Personal"}</span>
          </div>
          <p className="font-semibold text-[#1E2A4A] mb-2">{prayer?.name || "Your prayer"}</p>
          <p className="text-sm text-[#2D3A5E] leading-relaxed">{prayer?.request || "Your prayer request is ready to be shared with others."}</p>
        </div>

        <div className="space-y-3">
          <PrimaryButton onClick={handleShare} className="w-full h-12 gap-2">
            <Share2 size={15} /> Share now
          </PrimaryButton>
          <OutlineButton onClick={copyLink} className="w-full h-12 gap-2">
            <Copy size={14} /> Copy link
          </OutlineButton>
          <button onClick={onDone} className="w-full text-center text-[#9AA3BC] text-sm hover:text-[#7A85A3] transition-colors">
            Back to home
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Screen 4: Pray ───────────────────────────────────────────────────────────

function PrayScreen({ prayers, onPrayed }: { prayers: PrayerRequest[]; onPrayed: (id: number) => void }) {
  const approved = prayers.filter((p) => p.approved);
  const [index, setIndex] = useState(0);
  const [showAmen, setShowAmen] = useState(false);
  const [prayedIds, setPrayedIds] = useState<Set<number>>(new Set());
  const [streak, setStreak] = useState(() => getStreak());

  if (approved.length === 0) {
    return <NoPrayersContent />;
  }

  // Sort urgent first
  const sorted = [...approved].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));
  const prayer = sorted[index % sorted.length];
  const hasPrayed = prayedIds.has(prayer.id);
  const allPrayed = sorted.every((p) => prayedIds.has(p.id));

  const handlePray = () => {
    if (hasPrayed) return;
    onPrayed(prayer.id);
    setPrayedIds((s) => new Set([...s, prayer.id]));
    recordPrayer();
    setStreak(getStreak());
    setShowAmen(true);
    setTimeout(() => {
      setShowAmen(false);
      setIndex((i) => i + 1);
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <div className="max-w-xl mx-auto px-6 py-12">

        {/* Daily verse */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-[#EEF2FF] rounded-2xl p-5 mb-8 flex gap-4"
        >
          <BookOpen size={20} className="text-[#1E3A8A] shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <p className="text-xs font-semibold text-[#1E3A8A] mb-1">Today's Promise</p>
            <p className="text-[#1E2A4A] text-sm leading-relaxed font-medium">"{DAILY_VERSE.text}"</p>
            <p className="text-[#7A85A3] text-xs mt-1.5 italic">{DAILY_VERSE.reference}</p>
          </div>
        </motion.div>

        {/* Streak */}
        {streak.count > 0 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center justify-center gap-2 mb-6"
          >
            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-full text-sm font-semibold">
              <Flame size={16} className="text-[#FBBF24]" />
              {streak.count} Day Prayer Streak
            </div>
          </motion.div>
        )}

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] flex items-center justify-center mx-auto mb-4">
            <HandHeart size={26} className="text-[#1E3A8A]" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold text-[#1E2A4A] mb-1">Pray For Someone</h1>
          <p className="text-[#7A85A3] text-sm">{(index % sorted.length) + 1} of {sorted.length} requests</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={prayer.id}
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="bg-white rounded-2xl p-8 mb-6"
            style={{ boxShadow: "0 8px 40px rgba(30,58,138,0.10)" }}
          >
            {prayer.urgent && (
              <div className="flex items-center gap-1.5 text-red-500 text-xs font-bold mb-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <AlertTriangle size={13} />
                Urgent Prayer Request
              </div>
            )}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                <span className="text-lg font-bold text-[#1E3A8A]">{prayer.name[0]}</span>
              </div>
              <div>
                <p className="font-bold text-[#1E2A4A] text-lg">{prayer.name}</p>
                <span className="text-xs text-[#1E3A8A] font-medium bg-[#EEF2FF] px-2 py-0.5 rounded-full">
                  {prayer.category}
                </span>
              </div>
            </div>
            <p className="text-[#2D3A5E] text-base leading-relaxed">{prayer.request}</p>
            <div className="mt-5 pt-5 border-t border-[#EEF0F8] flex items-center gap-2">
              <Users size={14} className="text-[#1E3A8A]" />
              <span className="text-[#1E3A8A] font-semibold text-sm">{prayer.prayerCount} people prayed</span>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-3">
          <PrimaryButton onClick={handlePray} disabled={hasPrayed} className="flex-1 h-12 gap-2">
            <HandHeart size={16} />
            {hasPrayed ? "Prayed" : "I Prayed"}
          </PrimaryButton>
          <OutlineButton onClick={() => setIndex((i) => i + 1)} className="flex-1 h-12 gap-2">
            {allPrayed ? "Start Over" : "Next"} <ChevronRight size={16} />
          </OutlineButton>
        </div>
      </div>

      {/* Amen overlay */}
      <AnimatePresence>
        {showAmen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            style={{ background: "rgba(255,255,255,0.65)", backdropFilter: "blur(8px)" }}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-[#1E3A8A] px-14 py-8 rounded-3xl text-center"
              style={{ boxShadow: "0 16px 48px rgba(30,58,138,0.45)" }}
            >
              <div className="w-14 h-14 mx-auto mb-3 bg-white/20 rounded-2xl p-2" style={{ filter: "brightness(0) invert(1)" }}>
                <ImageWithFallback src={prayingHandsLogo} alt="Praying hands" className="w-full h-full object-contain" />
              </div>
              <p className="text-white text-4xl font-bold">Amen.</p>
              <p className="text-white/80 text-base mt-1">God heard you.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── No Prayers ───────────────────────────────────────────────────────────────

function NoPrayersContent() {
  return (
    <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-28 h-28 rounded-3xl bg-[#EEF2FF] flex items-center justify-center mx-auto mb-6" style={{ boxShadow: "0 8px 32px rgba(30,58,138,0.15)" }}>
          <Star size={52} className="text-[#1E3A8A]" strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-bold text-[#1E2A4A] mb-2">{"You've prayed for everyone today!"}</h2>
        <p className="text-[#7A85A3] mb-4">God bless you for your faithfulness.</p>
        <p className="text-[#9AA3BC] text-sm italic flex items-center justify-center gap-1.5">
          <BookOpen size={13} /> James 5:16
        </p>
      </div>
    </div>
  );
}

// ─── Screen 5: Testimonies ────────────────────────────────────────────────────

function TestimoniesScreen({ testimonies, onSubmit }: {
  testimonies: Testimony[];
  onSubmit: (name: string, text: string) => void;
}) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [filter, setFilter] = useState<Category | "All">("All");
  const [query, setQuery] = useState("");

  const approved = testimonies.filter((t) => t.approved);
  const filtered = approved.filter((t) => {
    const matchCat = filter === "All" || t.category === filter;
    const matchQ = query === "" || t.text.toLowerCase().includes(query.toLowerCase()) || t.name.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  const handleSend = () => {
    if (!name.trim() || !text.trim()) return;
    onSubmit(name, text);
    setSent(true);
    setName("");
    setText("");
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] flex items-center justify-center mx-auto mb-4">
            <Sparkles size={24} className="text-[#1E3A8A]" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-bold text-[#1E2A4A] mb-2">Testimonies</h1>
          <p className="text-[#7A85A3]">Celebrate what God has done</p>
        </div>

        {/* Submit form */}
        <div className="max-w-2xl mx-auto mb-14">
          <div className="bg-white rounded-2xl p-7 space-y-4" style={{ boxShadow: "0 4px 24px rgba(30,58,138,0.08)" }}>
            <h3 className="font-bold text-[#1E2A4A] flex items-center gap-2">
              <Star size={15} className="text-[#1E3A8A]" />
              Share your testimony
            </h3>
            <TextInput placeholder="First Name" value={name} onChange={setName} maxLength={15} />
            <Textarea placeholder="How did God answer your prayer?" value={text} onChange={setText} maxLength={400} rows={4} />
            {sent ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-12 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                <span className="text-green-700 text-sm font-semibold">Testimony published live!</span>
              </motion.div>
            ) : (
              <PrimaryButton onClick={handleSend} disabled={!name.trim() || !text.trim()} className="w-full h-12 gap-2">
                <Send size={14} /> Submit Testimony
              </PrimaryButton>
            )}
          </div>
        </div>

        {/* Filters + search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA3BC]" />
            <input
              placeholder="Search testimonies..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-xl bg-white text-[#1E2A4A] placeholder-[#9AA3BC] text-sm outline-none focus:ring-2 focus:ring-[#1E3A8A]/30 border border-[#EEF2FF]"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={14} className="text-[#9AA3BC]" />
            {(["All", ...CATEGORIES] as const).map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c as Category | "All")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  filter === c ? "bg-[#1E3A8A] text-white" : "bg-white text-[#7A85A3] border border-[#EEF2FF] hover:border-[#1E3A8A]/30"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-[#9AA3BC]">
              <Search size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No testimonies match your filter.</p>
            </div>
          ) : filtered.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white rounded-2xl p-6 flex flex-col"
              style={{ boxShadow: "0 4px 16px rgba(30,58,138,0.07)" }}
            >
              <Star size={13} className="text-[#1E3A8A] mb-3" />
              <p className="text-[#2D3A5E] text-sm leading-relaxed flex-1 mb-4">{t.text}</p>
              <div className="pt-4 border-t border-[#EEF0F8]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                      <span className="text-xs font-bold text-[#1E3A8A]">{t.name[0]}</span>
                    </div>
                    <span className="text-[#1E3A8A] text-xs font-semibold">{t.name}</span>
                  </div>
                  <span className="text-[#9AA3BC] text-xs">{t.daysAgo}d ago</span>
                </div>
                <div className="flex items-center gap-1.5 text-[#9AA3BC] text-xs mt-1">
                  <Users size={11} />
                  {t.prayerCount} people prayed · {t.category}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Account / Auth ────────────────────────────────────────────────────────

function AccountScreen({ currentUser, onAuthenticated, onLogout, onBack, onAdminLogin }: {
  currentUser: AuthUser | null;
  onAuthenticated: (user: AuthUser) => void;
  onLogout: () => void;
  onBack: () => void;
  onAdminLogin: () => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "signin" && normalizedEmail === "prayerbox@gmail.com" && password === "admin123") {
      onAdminLogin();
      return;
    }

    setLoading(true);
    try {
      const response = mode === "signup"
        ? await api.register(name.trim(), normalizedEmail, password, phone.trim(), avatar)
        : await api.login(normalizedEmail, password);
      onAuthenticated(response.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center mx-auto mb-5" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <User size={30} className="text-[#1E3A8A]" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-[#1E2A4A]">Your Account</h2>
          <p className="text-[#9AA3BC] text-sm mt-1">Create an account or sign in to post with your name.</p>
        </div>

        <div className="bg-white rounded-2xl p-7 space-y-4" style={{ boxShadow: "0 4px 24px rgba(30,58,138,0.08)" }}>
          {currentUser ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#EEF2FF] p-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white">
                  {currentUser.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="h-full w-full object-cover" />
                  ) : (
                    <User size={18} className="text-[#1E3A8A]" />
                  )}
                </div>
                <div>
                  <p className="text-[#1E3A8A] font-semibold">{currentUser.name}</p>
                  <p className="text-[#7A85A3] text-sm">Ready to pray and share</p>
                </div>
              </div>
              <PrimaryButton onClick={onLogout} className="w-full h-12 gap-2">
                <LogOut size={14} /> Sign Out
              </PrimaryButton>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F5F6FA] p-1">
                <button onClick={() => setMode("signin")} className={cn("h-10 rounded-lg text-sm font-semibold transition-colors", mode === "signin" ? "bg-white text-[#1E3A8A] shadow-sm" : "text-[#7A85A3]")}>
                  Sign In
                </button>
                <button onClick={() => setMode("signup")} className={cn("h-10 rounded-lg text-sm font-semibold transition-colors", mode === "signup" ? "bg-white text-[#1E3A8A] shadow-sm" : "text-[#7A85A3]")}>
                  Create Account
                </button>
              </div>

              {mode === "signup" && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-[#1E2A4A] mb-2">Full Name</label>
                    <TextInput placeholder="e.g. Tinashe" value={name} onChange={setName} maxLength={30} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1E2A4A] mb-2">Phone Number</label>
                    <TextInput placeholder="e.g. +263 77 123 4567" value={phone} onChange={setPhone} maxLength={20} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1E2A4A] mb-2">Profile Photo</label>
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#C7D2FE] bg-[#F5F6FA] px-4 py-3 text-sm font-medium text-[#1E3A8A] transition hover:bg-[#EEF2FF]">
                      <User size={16} />
                      {avatar ? "Change photo" : "Upload an image"}
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
                    {avatar && (
                      <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#EEF2FF] p-3">
                        <img src={avatar} alt="Profile preview" className="h-12 w-12 rounded-full object-cover" />
                        <p className="text-sm text-[#1E2A4A]">Photo ready to use</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-semibold text-[#1E2A4A] mb-2">Email</label>
                <TextInput type="email" placeholder="you@example.com" value={email} onChange={setEmail} maxLength={120} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#1E2A4A] mb-2">Password</label>
                <TextInput type="password" placeholder="Enter a password" value={password} onChange={setPassword} maxLength={80} />
              </div>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <PrimaryButton onClick={handleSubmit} disabled={loading || !email.trim() || !password.trim() || (mode === "signup" && !name.trim())} className="w-full h-12 gap-2">
                {loading ? "Please wait..." : mode === "signup" ? "Create Account" : "Sign In"}
              </PrimaryButton>
            </>
          )}

          <button onClick={onBack} className="w-full text-center text-[#9AA3BC] text-sm hover:text-[#7A85A3] transition-colors flex items-center justify-center gap-1">
            <ArrowLeft size={13} /> Back
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Login ──────────────────────────────────────────────────────────────

function AdminLoginScreen({ onLogin, onBack }: { onLogin: () => void; onBack: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleLogin = () => {
    if (password === "admin123") {
      onLogin();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center px-6">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center mx-auto mb-5" style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
            <Lock size={32} className="text-[#1E3A8A]" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-[#1E2A4A]">Admin Login</h2>
          <p className="text-[#9AA3BC] text-sm mt-1">Authorized Developers Only</p>
        </div>

        <div className="bg-white rounded-2xl p-7 space-y-4" style={{ boxShadow: "0 4px 24px rgba(30,58,138,0.08)" }}>
          <div className={cn("rounded-xl overflow-hidden", error && "ring-2 ring-red-400")}>
            <TextInput type="password" placeholder="Password" value={password} onChange={setPassword} />
          </div>
          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs text-center flex items-center justify-center gap-1">
              <X size={12} /> Incorrect password. Try again.
            </motion.p>
          )}
          <PrimaryButton onClick={handleLogin} className="w-full h-12 gap-2">
            <Lock size={14} /> Login
          </PrimaryButton>
          <button onClick={onBack} className="w-full text-center text-[#9AA3BC] text-sm hover:text-[#7A85A3] transition-colors flex items-center justify-center gap-1">
            <ArrowLeft size={13} /> Back
          </button>
          <p className="text-center text-[#9AA3BC] text-xs"></p>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

type AdminTab = "pending" | "approved" | "testimonies" | "analytics";

function AdminDashboard({
  prayers, testimonies, users, onApprovePrayer, onRejectPrayer, onToggleUrgent,
  onApproveTestimony, onRejectTestimony, onDeleteUser, onLogout,
}: {
  prayers: PrayerRequest[];
  testimonies: Testimony[];
  users: AuthUser[];
  onApprovePrayer: (id: number) => void;
  onRejectPrayer: (id: number) => void;
  onToggleUrgent: (id: number) => void;
  onApproveTestimony: (id: number) => void;
  onRejectTestimony: (id: number) => void;
  onDeleteUser: (id: number) => void;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<AdminTab>("pending");

  const pendingPrayers = prayers.filter((p) => !p.approved);
  const approvedPrayers = prayers.filter((p) => p.approved);
  const pendingTestimonies = testimonies.filter((t) => !t.approved);
  const approvedTestimonies = testimonies.filter((t) => t.approved);
  const totalPrayers = prayers.reduce((sum, p) => sum + p.prayerCount, 0);

  const tabs: { key: AdminTab; label: string; icon: typeof Send; badge?: number }[] = [
    { key: "pending", label: "Pending", icon: FileText, badge: pendingPrayers.length + pendingTestimonies.length },
    { key: "approved", label: "Approved", icon: CheckCircle },
    { key: "testimonies", label: "Testimonies", icon: Sparkles },
    { key: "analytics", label: "Analytics", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1E2A4A]">Leader Panel</h1>
            <p className="text-[#7A85A3] text-sm mt-0.5">Moderate and manage content</p>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 text-[#7A85A3] hover:text-[#1E2A4A] text-sm font-medium transition-colors">
            <LogOut size={15} /> Logout
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Requests", value: prayers.length, icon: Send, color: "text-[#1E3A8A] bg-[#EEF2FF]" },
            { label: "Prayers Offered", value: totalPrayers, icon: HandHeart, color: "text-purple-500 bg-purple-50" },
            { label: "Testimonies", value: approvedTestimonies.length, icon: Sparkles, color: "text-amber-500 bg-amber-50" },
            { label: "Pending Review", value: pendingPrayers.length + pendingTestimonies.length, icon: AlertTriangle, color: "text-red-500 bg-red-50" },
            { label: "Accounts", value: users.length, icon: Users, color: "text-emerald-500 bg-emerald-50" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 2px 12px rgba(30,58,138,0.07)" }}>
                <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", stat.color.split(" ")[1])}>
                  <Icon size={17} className={stat.color.split(" ")[0]} />
                </div>
                <p className="text-2xl font-bold text-[#1E2A4A]">{stat.value}</p>
                <p className="text-[#7A85A3] text-xs mt-0.5">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2",
                  tab === t.key ? "bg-[#1E3A8A] text-white" : "bg-white text-[#7A85A3] hover:text-[#1E2A4A] border border-[#EEF2FF]"
                )}
                style={tab === t.key ? { boxShadow: "0 4px 14px rgba(30,58,138,0.3)" } : {}}
              >
                <Icon size={14} />
                {t.label}
                {t.badge != null && t.badge > 0 && (
                  <span className={cn("w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center",
                    tab === t.key ? "bg-white/25 text-white" : "bg-red-100 text-red-500"
                  )}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* Pending */}
          {tab === "pending" && (
            <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {pendingPrayers.length === 0 && pendingTestimonies.length === 0 ? (
                <div className="text-center py-20 text-[#9AA3BC]">
                  <CheckCircle size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="font-medium">All caught up!</p>
                </div>
              ) : (
                <>
                  {pendingPrayers.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[#7A85A3] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Send size={12} /> Prayer Requests ({pendingPrayers.length})
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingPrayers.map((p) => (
                          <motion.div key={p.id} layout exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                                  <span className="text-xs font-bold text-[#1E3A8A]">{p.name[0]}</span>
                                </div>
                                <span className="font-semibold text-[#1E2A4A]">{p.name}</span>
                              </div>
                              <span className="text-xs text-[#1E3A8A] bg-[#EEF2FF] px-2 py-0.5 rounded-full">{p.category}</span>
                            </div>
                            <p className="text-[#2D3A5E] text-sm leading-relaxed mb-4">{p.request}</p>
                            <div className="flex gap-2 flex-wrap">
                              <motion.button whileTap={{ scale: 0.95 }} onClick={() => onToggleUrgent(p.id)} className="h-9 px-3 rounded-lg bg-orange-100 text-orange-600 text-xs font-semibold flex items-center justify-center gap-1">
                                <AlertTriangle size={12} /> Urgent
                              </motion.button>
                              <motion.button whileTap={{ scale: 0.95 }} onClick={() => onRejectPrayer(p.id)} className="flex-1 h-9 rounded-lg bg-red-500 text-white text-xs font-semibold flex items-center justify-center gap-1 min-w-0">
                                <X size={12} /> Delete
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                  {pendingTestimonies.length > 0 && (
                    <div className="mt-6">
                      <p className="text-xs font-semibold text-[#7A85A3] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Sparkles size={12} /> Testimonies ({pendingTestimonies.length})
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingTestimonies.map((t) => (
                          <motion.div key={t.id} layout exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.05)" }}>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-9 h-9 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                                <span className="text-xs font-bold text-[#1E3A8A]">{t.name[0]}</span>
                              </div>
                              <span className="font-semibold text-[#1E2A4A]">{t.name}</span>
                            </div>
                            <p className="text-[#2D3A5E] text-sm leading-relaxed mb-4">{t.text}</p>
                            <div className="flex gap-2">
                              <motion.button whileTap={{ scale: 0.95 }} onClick={() => onRejectTestimony(t.id)} className="flex-1 h-9 rounded-lg bg-red-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
                                <X size={12} /> Delete
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* Approved */}
          {tab === "approved" && (
            <motion.div key="approved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvedPrayers.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  {p.urgent && (
                    <div className="flex items-center gap-1 text-red-500 text-xs font-bold mb-2">
                      <AlertTriangle size={11} /> Urgent
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                      <span className="text-xs font-bold text-[#1E3A8A]">{p.name[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-[#1E2A4A] text-sm">{p.name}</span>
                      <span className="ml-2 text-xs text-[#1E3A8A] bg-[#EEF2FF] px-1.5 py-0.5 rounded-full">{p.category}</span>
                    </div>
                  </div>
                  <p className="text-[#2D3A5E] text-xs leading-relaxed mb-3 line-clamp-3">{p.request}</p>
                  <div className="flex items-center justify-between text-xs text-[#9AA3BC]">
                    <div className="flex items-center gap-1">
                      <Users size={11} /> {p.prayerCount} prayed
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle size={11} className="text-green-500" /> Live
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Testimonies tab */}
          {tab === "testimonies" && (
            <motion.div key="testimonies" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvedTestimonies.map((t) => (
                <div key={t.id} className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <Star size={13} className="text-[#1E3A8A] mb-2" />
                  <p className="text-[#2D3A5E] text-sm leading-relaxed mb-3 line-clamp-4">{t.text}</p>
                  <div className="flex items-center justify-between text-xs text-[#9AA3BC]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                        <span className="text-[9px] font-bold text-[#1E3A8A]">{t.name[0]}</span>
                      </div>
                      {t.name}
                    </div>
                    <span>{t.daysAgo}d ago</span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Analytics */}
          {tab === "analytics" && (
            <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {[
                    { label: "Answered Prayer Rate", value: `${approvedTestimonies.length}/${prayers.length}`, sub: "requests with testimonies", icon: TrendingUp, color: "text-green-500 bg-green-50" },
                    { label: "Most Active Category", value: "Studies", sub: "based on prayer volume", icon: Star, color: "text-amber-500 bg-amber-50" },
                    { label: "Total Community Prayers", value: totalPrayers.toLocaleString(), sub: "prayers offered across all requests", icon: HandHeart, color: "text-[#1E3A8A] bg-[#EEF2FF]" },
                    { label: "Urgent Requests", value: prayers.filter((p) => p.urgent).length.toString(), sub: "flagged for urgent prayer", icon: AlertTriangle, color: "text-red-500 bg-red-50" },
                  ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", s.color.split(" ")[1])}>
                        <Icon size={18} className={s.color.split(" ")[0]} />
                      </div>
                      <p className="text-2xl font-bold text-[#1E2A4A] mb-1">{s.value}</p>
                      <p className="text-sm font-semibold text-[#1E2A4A] mb-0.5">{s.label}</p>
                      <p className="text-[#7A85A3] text-xs">{s.sub}</p>
                    </div>
                  );
                  })}
                </div>

                <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-lg font-semibold text-[#1E2A4A]">Registered Users</p>
                      <p className="text-sm text-[#7A85A3]">{users.length} total account{users.length === 1 ? "" : "s"}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
                      <Users size={18} className="text-[#1E3A8A]" />
                    </div>
                  </div>
                  {users.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {users.map((user) => (
                        <div key={user.id} className="border border-[#EEF2FF] rounded-xl p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#EEF2FF] flex items-center justify-center text-sm font-bold text-[#1E3A8A] overflow-hidden">
                              {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                              ) : (
                                user.name?.[0] || "U"
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-[#1E2A4A] text-sm truncate">{user.name}</p>
                              <p className="text-xs text-[#7A85A3] truncate">{user.email}</p>
                              <p className="text-[11px] text-[#9AA3BC] mt-1">Owner: {user.name} · {user.phone || "No phone added"}</p>
                            </div>
                            <button onClick={() => onDeleteUser(user.id)} className="text-xs font-semibold text-red-500">Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#7A85A3]">No accounts created yet.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [showSplash, setShowSplash] = useState(true);
  const [prayers, setPrayers] = useState<PrayerRequest[]>(INITIAL_PRAYERS);
  const [testimonies, setTestimonies] = useState<Testimony[]>(INITIAL_TESTIMONIES);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem("ayp_currentUser");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [apiNotice, setApiNotice] = useState("");
  const [offline, setOffline] = useState(false);
  const [sharedPrayer, setSharedPrayer] = useState<{ name: string; request: string; category: Category } | null>(null);

  const navigate = (s: Screen) => setScreen(s);

  const refreshState = async () => {
    const state = await api.getState();
    setPrayers(state.prayers);
    setTestimonies(state.testimonies);
    setUsers(Array.isArray(state.users) ? state.users : []);
    setApiNotice("");
    setOffline(false);
  };

  useEffect(() => {
    refreshState().catch(() => {
      setOffline(true);
      setApiNotice("No internet connection. Showing the last available local experience.");
    });
  }, []);

  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem("ayp_currentUser", JSON.stringify(currentUser));
      } else {
        localStorage.removeItem("ayp_currentUser");
      }
    } catch {
      // localStorage unavailable
    }
  }, [currentUser]);

  const handleSubmitPrayer = async (name: string, request: string, category: Category) => {
    setSharedPrayer({ name, request, category });
    try {
      await api.submitPrayer(name, request, category);
      await refreshState();
    } catch {
      setPrayers((prev) => [...prev, { id: Date.now(), name, request, category, prayerCount: 0, approved: true }]);
      setApiNotice("Backend offline - saved only in this browser session.");
    }
    navigate("share");
  };

  const handlePrayed = async (id: number) => {
    const current = prayers.find((prayer) => prayer.id === id);
    setPrayers((prev) => prev.map((p) => p.id === id ? { ...p, prayerCount: p.prayerCount + 1 } : p));
    try {
      await api.prayForRequest(id);
      await refreshState();
    } catch {
      if (current) {
        setPrayers((prev) => prev.map((p) => p.id === id ? { ...p, prayerCount: current.prayerCount + 1 } : p));
      }
      setApiNotice("Backend offline - prayer count is temporary.");
    }
  };

  const handleSubmitTestimony = async (name: string, text: string) => {
    try {
      await api.submitTestimony(name, text);
      await refreshState();
    } catch {
      setTestimonies((prev) => [...prev, { id: Date.now(), name, text, category: "Personal", daysAgo: 0, prayerCount: 0, approved: true }]);
      setApiNotice("Backend offline - saved only in this browser session.");
    }
  };

  const updatePrayer = async (id: number, updates: Partial<Pick<PrayerRequest, "approved" | "urgent">>) => {
    setPrayers((prev) => prev.map((p) => p.id === id ? { ...p, ...updates } : p));
    try {
      await api.updatePrayer(id, updates);
      await refreshState();
    } catch {
      setApiNotice("Backend offline - moderation change is temporary.");
    }
  };

  const deletePrayer = async (id: number) => {
    const previous = prayers;
    setPrayers((prev) => prev.filter((p) => p.id !== id));
    try {
      await api.deletePrayer(id);
      await refreshState();
    } catch {
      setPrayers(previous);
      setApiNotice("Backend offline - delete could not be saved.");
    }
  };

  const updateTestimony = async (id: number, updates: Partial<Pick<Testimony, "approved">>) => {
    setTestimonies((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t));
    try {
      await api.updateTestimony(id, updates);
      await refreshState();
    } catch {
      setApiNotice("Backend offline - moderation change is temporary.");
    }
  };

  const deleteTestimony = async (id: number) => {
    const previous = testimonies;
    setTestimonies((prev) => prev.filter((t) => t.id !== id));
    try {
      await api.deleteTestimony(id);
      await refreshState();
    } catch {
      setTestimonies(previous);
      setApiNotice("Backend offline - delete could not be saved.");
    }
  };

  const handleAuthSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setApiNotice("");
    navigate("submit");
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await api.deleteUser(id);
      await refreshState();
    } catch {
      setUsers((prev) => prev.filter((user) => user.id !== id));
      setApiNotice("Account removed from this device.");
    }
  };

  const handleAdminLogin = () => {
    setCurrentUser({ id: 0, name: "Prayerbox Admin", email: "prayerbox@gmail.com" });
    setApiNotice("");
    navigate("admin-dashboard");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setApiNotice("");
    navigate("submit");
  };

  const navActive = (): string => {
    if (screen === "submit" || screen === "success") return "submit";
    if (screen === "pray") return "pray";
    if (screen === "testimonies") return "testimonies";
    return "";
  };

  const showNav = !["splash", "onboarding", "admin-login", "admin-dashboard", "account", "settings", "share"].includes(screen);

  return (
    <div className="min-h-screen bg-background font-['Inter',sans-serif]">
      {apiNotice && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs font-semibold text-amber-800">
          {apiNotice}
        </div>
      )}

      {offline && (
        <div className="bg-[#FFF7ED] border-b border-orange-200 px-4 py-2 text-center text-xs font-semibold text-orange-700 flex items-center justify-center gap-2">
          <WifiOff size={14} /> No internet connection. Prayerbox is running in offline mode.
        </div>
      )}

      {showNav && <TopNav active={navActive()} onNavigate={navigate} currentUser={currentUser} />}

      {screen === "admin-dashboard" && (
        <header className="bg-white border-b border-[#EEF2FF] sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <button onClick={() => navigate("submit")} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center overflow-hidden">
                <ImageWithFallback src={prayingHandsLogo} alt="AY Prayerbox logo" className="w-7 h-7 object-contain" />
              </div>
              <span className="font-bold text-[#1E2A4A] text-lg">AY Prayerbox</span>
            </button>
            <span className="text-xs font-semibold text-[#1E3A8A] bg-[#EEF2FF] px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <Lock size={11} /> Leader Mode
            </span>
          </div>
        </header>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {screen === "splash" && (showSplash ? <SplashLoadingScreen onFinish={() => { setShowSplash(false); navigate(currentUser ? "submit" : "onboarding"); }} /> : <SplashScreen onStart={() => navigate("submit")} onPray={() => navigate("pray")} prayers={prayers} testimonies={testimonies} />)}
          {screen === "onboarding" && <OnboardingScreen onCreateAccount={() => navigate("account")} onLogin={() => navigate("account")} onSkip={() => navigate("submit")} />}
          {screen === "submit" && <SubmitScreen onSubmit={handleSubmitPrayer} defaultName={currentUser?.name?.split(" ")[0]} />}
          {screen === "success" && <SuccessScreen onPray={() => navigate("pray")} />}
          {screen === "share" && <SharePrayerScreen prayer={sharedPrayer} onDone={() => navigate("submit")} />}
          {screen === "pray" && (
            <PrayScreen
              prayers={prayers}
              onPrayed={handlePrayed}
            />
          )}
          {screen === "testimonies" && (
            <TestimoniesScreen
              testimonies={testimonies}
              onSubmit={handleSubmitTestimony}
            />
          )}
          {screen === "account" && (
            <AccountScreen
              currentUser={currentUser}
              onAuthenticated={handleAuthSuccess}
              onLogout={handleLogout}
              onBack={() => navigate("submit")}
              onAdminLogin={handleAdminLogin}
            />
          )}
          {screen === "settings" && <SettingsScreen onBack={() => navigate("submit")} onLogout={handleLogout} />}
          {screen === "admin-login" && (
            <AdminLoginScreen
              onLogin={() => navigate("admin-dashboard")}
              onBack={() => navigate("submit")}
            />
          )}
          {screen === "admin-dashboard" && (
            <AdminDashboard
              prayers={prayers}
              testimonies={testimonies}
              users={users}
              onApprovePrayer={(id) => updatePrayer(id, { approved: true })}
              onRejectPrayer={deletePrayer}
              onToggleUrgent={(id) => updatePrayer(id, { urgent: !prayers.find((p) => p.id === id)?.urgent })}
              onApproveTestimony={(id) => updateTestimony(id, { approved: true })}
              onRejectTestimony={deleteTestimony}
              onDeleteUser={handleDeleteUser}
              onLogout={() => navigate("submit")}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
