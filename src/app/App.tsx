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
import type { AuthSession, AuthUser, Category, PrayerRequest, Testimony } from "./lib/api";
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

type ThemeMode = "light" | "dark" | "system";
type ColorTheme = "blue" | "emerald" | "amber";
type FontSizeMode = "small" | "medium" | "large";

type AppearanceSettings = {
  themeMode: ThemeMode;
  colorTheme: ColorTheme;
  fontSize: FontSizeMode;
  compactMode: boolean;
};

const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  themeMode: "system",
  colorTheme: "blue",
  fontSize: "medium",
  compactMode: false,
};

function loadAppearanceSettings(): AppearanceSettings {
  try {
    const raw = localStorage.getItem("ayp_settings");
    if (!raw) return DEFAULT_APPEARANCE_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppearanceSettings>;
    return {
      themeMode: parsed.themeMode === "light" || parsed.themeMode === "dark" || parsed.themeMode === "system" ? parsed.themeMode : "system",
      colorTheme: parsed.colorTheme === "blue" || parsed.colorTheme === "emerald" || parsed.colorTheme === "amber" ? parsed.colorTheme : "blue",
      fontSize: parsed.fontSize === "small" || parsed.fontSize === "medium" || parsed.fontSize === "large" ? parsed.fontSize : "medium",
      compactMode: Boolean(parsed.compactMode),
    };
  } catch {
    return DEFAULT_APPEARANCE_SETTINGS;
  }
}

function applyAppearanceSettings(settings: AppearanceSettings) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const darkPreferred = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  const useDark = settings.themeMode === "dark" || (settings.themeMode === "system" && darkPreferred);
  root.classList.toggle("dark", Boolean(useDark));

  const fontSizeValue = settings.fontSize === "small" ? "14px" : settings.fontSize === "large" ? "18px" : "16px";
  root.style.setProperty("--font-size", fontSizeValue);

  root.setAttribute("data-compact", settings.compactMode ? "true" : "false");
  root.setAttribute("data-color-theme", settings.colorTheme);
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

function compressImageDataUrl(dataUrl: string, maxWidth = 640, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxWidth / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Unable to process image"));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    image.onerror = () => reject(new Error("Unable to load image"));
    image.src = dataUrl;
  });
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
        <div className="max-w-5xl mx-auto px-6 text-center text-[#9AA3BC] text-xs space-y-1.5">
          <div className="flex items-center justify-center gap-1.5">
            <BookOpen size={12} />
            <span>James 5:16 - "Pray for one another." - Anonymous to public.</span>
          </div>
          <p className="text-[11px] font-medium text-[#7A85A3]">Developed by Bluelinq Systems</p>
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

function SettingsScreen({
  onBack,
  onLogout,
  currentUser,
  onUpdateCurrentUser,
  onApplyAppearance,
}: {
  onBack: () => void;
  onLogout: () => void;
  currentUser: AuthUser | null;
  onUpdateCurrentUser: (updates: Partial<AuthUser>) => void;
  onApplyAppearance: (settings: AppearanceSettings) => void;
}) {
  const [profileImage, setProfileImage] = useState(currentUser?.avatar || "");
  const [fullName, setFullName] = useState(currentUser?.name || "");
  const [username, setUsername] = useState(currentUser?.username || (currentUser?.name || "").toLowerCase().replace(/\s+/g, "_"));
  const [email, setEmail] = useState(currentUser?.email || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [changeEmailInput, setChangeEmailInput] = useState(currentUser?.email || "");
  const [saveMessage, setSaveMessage] = useState("");

  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNext, setPasswordNext] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [securityBusy, setSecurityBusy] = useState(false);
  const [accountActionMessage, setAccountActionMessage] = useState("");

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(true);

  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("system");
  const [colorTheme, setColorTheme] = useState<"blue" | "emerald" | "amber">("blue");
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
  const [compactMode, setCompactMode] = useState(false);

  const [profileVisibility, setProfileVisibility] = useState<"public" | "community" | "private">("community");
  const [dataSharing, setDataSharing] = useState(false);
  const [locationPermission, setLocationPermission] = useState<"ask" | "enabled" | "disabled">("ask");
  const [analyticsTracking, setAnalyticsTracking] = useState(true);

  const [language, setLanguage] = useState("English");
  const [country, setCountry] = useState("Zimbabwe");
  const [currency, setCurrency] = useState("USD");
  const [timeZone, setTimeZone] = useState("Africa/Harare");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");

  useEffect(() => {
    setProfileImage(currentUser?.avatar || "");
    setFullName(currentUser?.name || "");
    setUsername(currentUser?.username || (currentUser?.name || "").toLowerCase().replace(/\s+/g, "_"));
    setEmail(currentUser?.email || "");
    setPhone(currentUser?.phone || "");
    setBio(currentUser?.bio || "");
    setChangeEmailInput(currentUser?.email || "");
  }, [currentUser]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ayp_settings");
      if (!saved) return;
      const parsed = JSON.parse(saved) as Record<string, unknown>;
      if (typeof parsed.bio === "string") setBio(parsed.bio);
      if (typeof parsed.twoFactorEnabled === "boolean") setTwoFactorEnabled(parsed.twoFactorEnabled);
      if (typeof parsed.emailNotifications === "boolean") setEmailNotifications(parsed.emailNotifications);
      if (typeof parsed.pushNotifications === "boolean") setPushNotifications(parsed.pushNotifications);
      if (typeof parsed.smsNotifications === "boolean") setSmsNotifications(parsed.smsNotifications);
      if (typeof parsed.marketingEmails === "boolean") setMarketingEmails(parsed.marketingEmails);
      if (typeof parsed.securityAlerts === "boolean") setSecurityAlerts(parsed.securityAlerts);
      if (parsed.themeMode === "light" || parsed.themeMode === "dark" || parsed.themeMode === "system") setThemeMode(parsed.themeMode);
      if (parsed.colorTheme === "blue" || parsed.colorTheme === "emerald" || parsed.colorTheme === "amber") setColorTheme(parsed.colorTheme);
      if (parsed.fontSize === "small" || parsed.fontSize === "medium" || parsed.fontSize === "large") setFontSize(parsed.fontSize);
      if (typeof parsed.compactMode === "boolean") setCompactMode(parsed.compactMode);
      if (parsed.profileVisibility === "public" || parsed.profileVisibility === "community" || parsed.profileVisibility === "private") setProfileVisibility(parsed.profileVisibility);
      if (typeof parsed.dataSharing === "boolean") setDataSharing(parsed.dataSharing);
      if (parsed.locationPermission === "ask" || parsed.locationPermission === "enabled" || parsed.locationPermission === "disabled") setLocationPermission(parsed.locationPermission);
      if (typeof parsed.analyticsTracking === "boolean") setAnalyticsTracking(parsed.analyticsTracking);
      if (typeof parsed.language === "string") setLanguage(parsed.language);
      if (typeof parsed.country === "string") setCountry(parsed.country);
      if (typeof parsed.currency === "string") setCurrency(parsed.currency);
      if (typeof parsed.timeZone === "string") setTimeZone(parsed.timeZone);
      if (typeof parsed.dateFormat === "string") setDateFormat(parsed.dateFormat);

      onApplyAppearance({
        themeMode:
          parsed.themeMode === "light" || parsed.themeMode === "dark" || parsed.themeMode === "system"
            ? parsed.themeMode
            : "system",
        colorTheme:
          parsed.colorTheme === "blue" || parsed.colorTheme === "emerald" || parsed.colorTheme === "amber"
            ? parsed.colorTheme
            : "blue",
        fontSize:
          parsed.fontSize === "small" || parsed.fontSize === "medium" || parsed.fontSize === "large"
            ? parsed.fontSize
            : "medium",
        compactMode: typeof parsed.compactMode === "boolean" ? parsed.compactMode : false,
      });
    } catch {
      // Ignore malformed local settings
    }
  }, [onApplyAppearance]);

  useEffect(() => {
    if (!currentUser) {
      setSessions([]);
      return;
    }
    setSessionsLoading(true);
    api.getSessions()
      .then((result) => setSessions(result.sessions || []))
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false));
  }, [currentUser]);

  const onProfileImageSelected = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setProfileImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveAllSettings = async () => {
    const appearanceSettings: AppearanceSettings = {
      themeMode,
      colorTheme,
      fontSize,
      compactMode,
    };

    try {
      localStorage.setItem(
        "ayp_settings",
        JSON.stringify({
          bio,
          twoFactorEnabled,
          emailNotifications,
          pushNotifications,
          smsNotifications,
          marketingEmails,
          securityAlerts,
          themeMode,
          colorTheme,
          fontSize,
          compactMode,
          profileVisibility,
          dataSharing,
          locationPermission,
          analyticsTracking,
          language,
          country,
          currency,
          timeZone,
          dateFormat,
        })
      );
    } catch {
      // ignore localStorage errors
    }

    onApplyAppearance(appearanceSettings);

    try {
      const response = await api.updateProfile({
        name: fullName,
        username,
        phone,
        avatar: profileImage,
        bio,
      });
      onUpdateCurrentUser(response.user);
      setSaveMessage("Settings saved.");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Unable to save profile changes.");
    }
    window.setTimeout(() => setSaveMessage(""), 2000);
  };

  const handleChangeEmail = async () => {
    if (!changeEmailInput.trim()) return;
    const password = window.prompt("Enter your current password to change email:") || "";
    if (!password.trim()) return;
    try {
      const response = await api.changeEmail(changeEmailInput.trim(), password);
      setEmail(response.user.email || changeEmailInput.trim());
      onUpdateCurrentUser(response.user);
      setSaveMessage("Email updated.");
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "Unable to change email.");
    }
    window.setTimeout(() => setSaveMessage(""), 2000);
  };

  const handlePasswordSubmit = async () => {
    setSecurityBusy(true);
    if (!passwordCurrent || !passwordNext || !passwordConfirm) {
      setPasswordMessage("Please complete all password fields.");
      setSecurityBusy(false);
      return;
    }
    if (passwordNext.length < 8) {
      setPasswordMessage("New password must be at least 8 characters.");
      setSecurityBusy(false);
      return;
    }
    if (passwordNext !== passwordConfirm) {
      setPasswordMessage("New password and confirmation do not match.");
      setSecurityBusy(false);
      return;
    }

    try {
      await api.changePassword(passwordCurrent, passwordNext);
      setPasswordMessage("Password updated. Other sessions have been revoked.");
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : "Unable to update password.");
    }
    setSecurityBusy(false);
    setPasswordCurrent("");
    setPasswordNext("");
    setPasswordConfirm("");
  };

  const handleLogoutAllDevices = async () => {
    const confirmed = window.confirm("Log out from all devices, including this one?");
    if (!confirmed) return;
    try {
      await api.logoutAll(true);
    } finally {
      onLogout();
    }
  };

  const handleDeactivateAccount = async () => {
    const confirmed = window.confirm("Deactivate this account on this device now?");
    if (!confirmed) return;

    try {
      const tokenResponse = await api.requestAccountActionToken("deactivate");
      const tokenInput = window.prompt(
        `Confirmation token generated (expires ${new Date(tokenResponse.expiresAt).toLocaleTimeString()}). Enter token to confirm deactivation:`,
        tokenResponse.confirmationToken
      );
      if (!tokenInput) return;
      await api.confirmAccountAction("deactivate", tokenInput.trim());
      setAccountActionMessage("Account deactivated.");
      onLogout();
    } catch (error) {
      setAccountActionMessage(error instanceof Error ? error.message : "Unable to deactivate account.");
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("Delete account permanently? This cannot be undone.");
    if (!confirmed) return;

    try {
      const tokenResponse = await api.requestAccountActionToken("delete");
      const tokenInput = window.prompt(
        `Confirmation token generated (expires ${new Date(tokenResponse.expiresAt).toLocaleTimeString()}). Enter token to permanently delete your account:`,
        tokenResponse.confirmationToken
      );
      if (!tokenInput) return;
      await api.confirmAccountAction("delete", tokenInput.trim());
      setAccountActionMessage("Account deleted.");
      onLogout();
      return;
    } catch {
      // fall back below
    }

    if (typeof currentUser?.id === "number") {
      try {
        await api.deleteUser(currentUser.id);
      } catch {
        // Ignore if endpoint is restricted; still clear local session
      }
    }
    onLogout();
  };

  const subscriptionStatus = "Free Plan";
  const createdLabel = currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : "Unknown";

  return (
    <div className="min-h-screen bg-[#F5F6FA] px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="rounded-2xl bg-white p-6" style={{ boxShadow: "0 4px 24px rgba(30,58,138,0.08)" }}>
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-[#1E3A8A]" />
            <h2 className="text-xl font-bold text-[#1E2A4A]">Settings</h2>
          </div>
          <p className="text-sm text-[#7A85A3] mt-1">Manage your profile, account, security, and app preferences.</p>
          {saveMessage && <p className="text-xs font-semibold text-green-600 mt-3">{saveMessage}</p>}
          {accountActionMessage && <p className="text-xs font-semibold text-amber-700 mt-1">{accountActionMessage}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-2xl bg-white p-6 space-y-4" style={{ boxShadow: "0 2px 14px rgba(0,0,0,0.05)" }}>
            <h3 className="text-lg font-bold text-[#1E2A4A]">1. Profile</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#EEF2FF] overflow-hidden flex items-center justify-center">
                {profileImage ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" /> : <User size={24} className="text-[#1E3A8A]" />}
              </div>
              <label className="text-xs font-semibold text-[#1E2A4A] cursor-pointer">
                <span className="inline-flex h-9 px-3 rounded-lg bg-[#EEF2FF] items-center">Upload Image</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onProfileImageSelected(e.target.files?.[0] || null)} />
              </label>
            </div>
            <TextInput value={fullName} onChange={setFullName} placeholder="Full name" />
            <TextInput value={username} onChange={setUsername} placeholder="Username" />
            <TextInput value={email} onChange={setEmail} placeholder="Email address" />
            <TextInput value={phone} onChange={setPhone} placeholder="Phone number" />
            <Textarea value={bio} onChange={setBio} placeholder="Bio" rows={3} maxLength={280} />
            <PrimaryButton onClick={saveAllSettings} className="w-full h-11">Save Changes</PrimaryButton>
          </section>

          <section className="rounded-2xl bg-white p-6 space-y-4" style={{ boxShadow: "0 2px 14px rgba(0,0,0,0.05)" }}>
            <h3 className="text-lg font-bold text-[#1E2A4A]">2. Account</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-[#F5F6FA] p-3"><p className="text-[#7A85A3] text-xs">Account Type</p><p className="font-semibold text-[#1E2A4A] capitalize">{currentUser?.role || "user"}</p></div>
              <div className="rounded-xl bg-[#F5F6FA] p-3"><p className="text-[#7A85A3] text-xs">Subscription</p><p className="font-semibold text-[#1E2A4A]">{subscriptionStatus}</p></div>
              <div className="rounded-xl bg-[#F5F6FA] p-3 col-span-2"><p className="text-[#7A85A3] text-xs">Created</p><p className="font-semibold text-[#1E2A4A]">{createdLabel}</p></div>
            </div>
            <div className="space-y-2">
              <TextInput value={changeEmailInput} onChange={setChangeEmailInput} placeholder="Change email" />
              <OutlineButton onClick={handleChangeEmail} className="w-full h-10">Change Email</OutlineButton>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button onClick={handleDeactivateAccount} className="h-10 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold">Deactivate Account</button>
              <button onClick={handleDeleteAccount} className="h-10 rounded-lg bg-red-50 text-red-600 text-xs font-semibold">Delete Account</button>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 space-y-4 lg:col-span-2" style={{ boxShadow: "0 2px 14px rgba(0,0,0,0.05)" }}>
            <h3 className="text-lg font-bold text-[#1E2A4A]">3. Security</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-[#1E2A4A]">Change Password</p>
                <TextInput value={passwordCurrent} onChange={setPasswordCurrent} placeholder="Current password" type="password" />
                <TextInput value={passwordNext} onChange={setPasswordNext} placeholder="New password" type="password" />
                <TextInput value={passwordConfirm} onChange={setPasswordConfirm} placeholder="Confirm new password" type="password" />
                <OutlineButton onClick={handlePasswordSubmit} disabled={securityBusy} className="w-full h-10">Update Password</OutlineButton>
                {passwordMessage && <p className="text-xs text-[#7A85A3]">{passwordMessage}</p>}
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-[#EEF2FF] p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#1E2A4A]">Two-Factor Authentication</p>
                    <p className="text-xs text-[#7A85A3]">Require extra verification on sign-in.</p>
                  </div>
                  <button onClick={() => setTwoFactorEnabled((v) => !v)} className={cn("h-7 px-3 rounded-full text-xs font-bold", twoFactorEnabled ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600")}>{twoFactorEnabled ? "On" : "Off"}</button>
                </div>
                <button onClick={handleLogoutAllDevices} className="w-full h-10 rounded-lg bg-red-50 text-red-600 text-xs font-semibold">Logout From All Devices</button>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[#1E2A4A] mb-2">Login Activity</p>
              <div className="overflow-x-auto rounded-xl border border-[#EEF2FF]">
                <table className="w-full text-xs">
                  <thead className="bg-[#F8FAFF] text-[#7A85A3]">
                    <tr>
                      <th className="text-left px-3 py-2">Device</th>
                      <th className="text-left px-3 py-2">IP</th>
                      <th className="text-left px-3 py-2">Last Used</th>
                      <th className="text-left px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionsLoading ? (
                      <tr><td className="px-3 py-3 text-[#9AA3BC]" colSpan={4}>Loading activity...</td></tr>
                    ) : sessions.length === 0 ? (
                      <tr><td className="px-3 py-3 text-[#9AA3BC]" colSpan={4}>No activity found.</td></tr>
                    ) : (
                      sessions.slice(0, 8).map((session) => (
                        <tr key={session.id} className="border-t border-[#EEF2FF]">
                          <td className="px-3 py-2 text-[#1E2A4A]">{session.userAgent || "Unknown device"}</td>
                          <td className="px-3 py-2 text-[#2D3A5E]">{session.ipAddress || "—"}</td>
                          <td className="px-3 py-2 text-[#2D3A5E]">{new Date(session.lastUsedAt).toLocaleString()}</td>
                          <td className="px-3 py-2">{session.current ? <span className="text-green-700">Current</span> : session.revokedAt ? <span className="text-red-600">Revoked</span> : <span className="text-[#1E3A8A]">Active</span>}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[#1E2A4A] mb-2">Active Sessions/Devices</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {sessions.filter((s) => !s.revokedAt).slice(0, 4).map((session) => (
                  <div key={session.id} className="rounded-xl bg-[#F5F6FA] p-3">
                    <p className="text-xs font-semibold text-[#1E2A4A] line-clamp-1">{session.userAgent || "Unknown device"}</p>
                    <p className="text-[11px] text-[#7A85A3]">{session.ipAddress || "—"}</p>
                  </div>
                ))}
                {sessions.filter((s) => !s.revokedAt).length === 0 && <p className="text-xs text-[#9AA3BC]">No active sessions.</p>}
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 space-y-4" style={{ boxShadow: "0 2px 14px rgba(0,0,0,0.05)" }}>
            <h3 className="text-lg font-bold text-[#1E2A4A]">4. Notifications</h3>
            {([
              { label: "Email notifications", value: emailNotifications, toggle: () => setEmailNotifications((v) => !v) },
              { label: "Push notifications", value: pushNotifications, toggle: () => setPushNotifications((v) => !v) },
              { label: "SMS notifications", value: smsNotifications, toggle: () => setSmsNotifications((v) => !v) },
              { label: "Marketing emails", value: marketingEmails, toggle: () => setMarketingEmails((v) => !v) },
              { label: "Security alerts", value: securityAlerts, toggle: () => setSecurityAlerts((v) => !v) },
            ]).map((item) => (
              <div key={item.label} className="rounded-xl border border-[#EEF2FF] p-3 flex items-center justify-between">
                <p className="text-sm font-medium text-[#1E2A4A]">{item.label}</p>
                <button
                  onClick={item.toggle}
                  className={cn("h-7 px-3 rounded-full text-xs font-bold", item.value ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600")}
                >
                  {item.value ? "On" : "Off"}
                </button>
              </div>
            ))}
          </section>

          <section className="rounded-2xl bg-white p-6 space-y-4" style={{ boxShadow: "0 2px 14px rgba(0,0,0,0.05)" }}>
            <h3 className="text-lg font-bold text-[#1E2A4A]">5. Appearance</h3>
            <div>
              <p className="text-xs text-[#7A85A3] mb-2">Theme Mode</p>
              <div className="flex gap-2 flex-wrap">
                {(["light", "dark", "system"] as const).map((mode) => (
                  <button key={mode} onClick={() => setThemeMode(mode)} className={cn("h-8 px-3 rounded-lg text-xs font-semibold border", themeMode === mode ? "bg-[#1E3A8A] border-[#1E3A8A] text-white" : "bg-white border-[#E5EAF7] text-[#1E2A4A]")}>{mode}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-[#7A85A3] mb-2">Color Theme</p>
              <select value={colorTheme} onChange={(e) => setColorTheme(e.target.value as "blue" | "emerald" | "amber")} className="w-full h-10 px-3 rounded-xl bg-[#F5F6FA] text-sm text-[#1E2A4A] outline-none">
                <option value="blue">Blue</option>
                <option value="emerald">Emerald</option>
                <option value="amber">Amber</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-[#7A85A3] mb-2">Font Size</p>
              <select value={fontSize} onChange={(e) => setFontSize(e.target.value as "small" | "medium" | "large")} className="w-full h-10 px-3 rounded-xl bg-[#F5F6FA] text-sm text-[#1E2A4A] outline-none">
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
            <div className="rounded-xl border border-[#EEF2FF] p-3 flex items-center justify-between">
              <p className="text-sm font-medium text-[#1E2A4A]">Compact Mode</p>
              <button onClick={() => setCompactMode((v) => !v)} className={cn("h-7 px-3 rounded-full text-xs font-bold", compactMode ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600")}>{compactMode ? "On" : "Off"}</button>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 space-y-4" style={{ boxShadow: "0 2px 14px rgba(0,0,0,0.05)" }}>
            <h3 className="text-lg font-bold text-[#1E2A4A]">6. Privacy</h3>
            <div>
              <p className="text-xs text-[#7A85A3] mb-2">Profile Visibility</p>
              <select value={profileVisibility} onChange={(e) => setProfileVisibility(e.target.value as "public" | "community" | "private")} className="w-full h-10 px-3 rounded-xl bg-[#F5F6FA] text-sm text-[#1E2A4A] outline-none">
                <option value="public">Public</option>
                <option value="community">Community Only</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div className="rounded-xl border border-[#EEF2FF] p-3 flex items-center justify-between">
              <p className="text-sm font-medium text-[#1E2A4A]">Data Sharing</p>
              <button onClick={() => setDataSharing((v) => !v)} className={cn("h-7 px-3 rounded-full text-xs font-bold", dataSharing ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600")}>{dataSharing ? "On" : "Off"}</button>
            </div>
            <div>
              <p className="text-xs text-[#7A85A3] mb-2">Location Permission</p>
              <select value={locationPermission} onChange={(e) => setLocationPermission(e.target.value as "ask" | "enabled" | "disabled")} className="w-full h-10 px-3 rounded-xl bg-[#F5F6FA] text-sm text-[#1E2A4A] outline-none">
                <option value="ask">Ask Every Time</option>
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
            <div className="rounded-xl border border-[#EEF2FF] p-3 flex items-center justify-between">
              <p className="text-sm font-medium text-[#1E2A4A]">Analytics Tracking</p>
              <button onClick={() => setAnalyticsTracking((v) => !v)} className={cn("h-7 px-3 rounded-full text-xs font-bold", analyticsTracking ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600")}>{analyticsTracking ? "On" : "Off"}</button>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 space-y-4 lg:col-span-2" style={{ boxShadow: "0 2px 14px rgba(0,0,0,0.05)" }}>
            <h3 className="text-lg font-bold text-[#1E2A4A]">7. Language & Region</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <select value={language} onChange={(e) => setLanguage(e.target.value)} className="h-10 px-3 rounded-xl bg-[#F5F6FA] text-sm text-[#1E2A4A] outline-none">
                <option>English</option>
                <option>Shona</option>
                <option>Ndebele</option>
              </select>
              <select value={country} onChange={(e) => setCountry(e.target.value)} className="h-10 px-3 rounded-xl bg-[#F5F6FA] text-sm text-[#1E2A4A] outline-none">
                <option>Zimbabwe</option>
                <option>South Africa</option>
                <option>Zambia</option>
              </select>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-10 px-3 rounded-xl bg-[#F5F6FA] text-sm text-[#1E2A4A] outline-none">
                <option>USD</option>
                <option>ZWL</option>
                <option>ZAR</option>
              </select>
              <select value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className="h-10 px-3 rounded-xl bg-[#F5F6FA] text-sm text-[#1E2A4A] outline-none">
                <option>Africa/Harare</option>
                <option>Africa/Johannesburg</option>
                <option>UTC</option>
              </select>
              <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} className="h-10 px-3 rounded-xl bg-[#F5F6FA] text-sm text-[#1E2A4A] outline-none">
                <option>DD/MM/YYYY</option>
                <option>MM/DD/YYYY</option>
                <option>YYYY-MM-DD</option>
              </select>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

function AccountScreen({ currentUser, initialMode = "signin", onAuthenticated, onLogout, onBack, onOpenAdmin }: {
  currentUser: AuthUser | null;
  initialMode?: "signin" | "signup";
  onAuthenticated: (user: AuthUser) => void;
  onLogout: () => void;
  onBack: () => void;
  onOpenAdmin: () => void;
}) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      try {
        const compressed = await compressImageDataUrl(result);
        setAvatar(compressed);
        setError("");
      } catch {
        setError("The photo could not be read. Please try another image.");
      }
    };
    reader.onerror = () => {
      setError("The photo could not be read. Please try another image.");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setError("");
    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "signup") {
      if (!name.trim()) {
        setError("Please enter your full name.");
        return;
      }
      if (!normalizedEmail) {
        setError("Please enter your email address.");
        return;
      }
      if (!password.trim()) {
        setError("Please enter a password.");
        return;
      }
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
                <button onClick={() => { setMode("signin"); setError(""); }} className={cn("h-10 rounded-lg text-sm font-semibold transition-colors", mode === "signin" ? "bg-white text-[#1E3A8A] shadow-sm" : "text-[#7A85A3]")}> 
                  Sign In
                </button>
                <button onClick={() => { setMode("signup"); setError(""); }} className={cn("h-10 rounded-lg text-sm font-semibold transition-colors", mode === "signup" ? "bg-white text-[#1E3A8A] shadow-sm" : "text-[#7A85A3]")}> 
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

              <OutlineButton onClick={onOpenAdmin} className="w-full h-11 gap-2">
                <Lock size={14} /> Admin Login
              </OutlineButton>
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

function AdminLoginScreen({ onLogin, onBack }: { onLogin: (user: AuthUser) => void; onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await api.login(email.trim().toLowerCase(), password);
      if (result.user.role !== "admin") {
        setError("This account does not have admin access.");
        return;
      }
      onLogin(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
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
          <div className="rounded-xl overflow-hidden">
            <TextInput type="email" placeholder="Admin email" value={email} onChange={setEmail} />
          </div>
          <div className={cn("rounded-xl overflow-hidden", Boolean(error) && "ring-2 ring-red-400")}>
            <TextInput type="password" placeholder="Password" value={password} onChange={setPassword} />
          </div>
          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs text-center flex items-center justify-center gap-1">
              <X size={12} /> {error}
            </motion.p>
          )}
          <PrimaryButton onClick={handleLogin} disabled={loading || !email.trim() || !password.trim()} className="w-full h-12 gap-2">
            <Lock size={14} /> {loading ? "Please wait..." : "Login"}
          </PrimaryButton>
          <button onClick={onBack} className="w-full text-center text-[#9AA3BC] text-sm hover:text-[#7A85A3] transition-colors flex items-center justify-center gap-1">
            <ArrowLeft size={13} /> Back
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

type AdminTab = "overview" | "pending" | "approved" | "testimonies" | "accounts" | "sessions" | "analytics";
type SessionFilter = "active" | "revoked" | "all";

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
  const [tab, setTab] = useState<AdminTab>("overview");
  const [userSearch, setUserSearch] = useState("");
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [sessionBusyId, setSessionBusyId] = useState("");
  const [logoutAllBusy, setLogoutAllBusy] = useState(false);
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>("active");
  const [sessionCurrentFirst, setSessionCurrentFirst] = useState(true);
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionSearch, setSessionSearch] = useState("");
  const sessionsPerPage = 6;

  const pendingPrayers = prayers.filter((p) => !p.approved);
  const approvedPrayers = prayers.filter((p) => p.approved);
  const pendingTestimonies = testimonies.filter((t) => !t.approved);
  const approvedTestimonies = testimonies.filter((t) => t.approved);
  const totalPrayers = prayers.reduce((sum, p) => sum + p.prayerCount, 0);
  const totalPending = pendingPrayers.length + pendingTestimonies.length;

  // Category breakdown
  const categoryMap: Record<string, number> = {};
  for (const p of prayers) {
    categoryMap[p.category] = (categoryMap[p.category] ?? 0) + 1;
  }
  const topCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  // Top 5 most prayed
  const topPrayers = [...approvedPrayers].sort((a, b) => b.prayerCount - a.prayerCount).slice(0, 5);

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const loadSessions = async () => {
    setSessionsLoading(true);
    setSessionsError("");
    try {
      const response = await api.getSessions();
      setSessions(Array.isArray(response.sessions) ? response.sessions : []);
    } catch (error) {
      setSessionsError(error instanceof Error ? error.message : "Unable to load sessions.");
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== "sessions") return;
    loadSessions().catch(() => {});
  }, [tab]);

  const filteredSessions = sessions.filter((session) => {
    if (sessionFilter === "active" && session.revokedAt) return false;
    if (sessionFilter === "revoked" && !session.revokedAt) return false;

    const query = sessionSearch.trim().toLowerCase();
    if (!query) return true;

    const id = session.id.toLowerCase();
    const ip = (session.ipAddress || "").toLowerCase();
    const userAgent = (session.userAgent || "").toLowerCase();
    return id.includes(query) || ip.includes(query) || userAgent.includes(query);
  });

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    if (sessionCurrentFirst) {
      if (a.current && !b.current) return -1;
      if (!a.current && b.current) return 1;
    }
    const aLastUsed = new Date(a.lastUsedAt).getTime();
    const bLastUsed = new Date(b.lastUsedAt).getTime();
    return bLastUsed - aLastUsed;
  });

  const totalSessionPages = Math.max(1, Math.ceil(sortedSessions.length / sessionsPerPage));
  const paginatedSessions = sortedSessions.slice((sessionPage - 1) * sessionsPerPage, sessionPage * sessionsPerPage);

  useEffect(() => {
    setSessionPage(1);
  }, [sessionFilter, sessionCurrentFirst, sessionSearch]);

  useEffect(() => {
    if (sessionPage > totalSessionPages) {
      setSessionPage(totalSessionPages);
    }
  }, [sessionPage, totalSessionPages]);

  const handleRevokeSession = async (id: string) => {
    setSessionBusyId(id);
    setSessionsError("");
    try {
      await api.revokeSession(id);
      await loadSessions();
    } catch (error) {
      setSessionsError(error instanceof Error ? error.message : "Unable to revoke session.");
    } finally {
      setSessionBusyId("");
    }
  };

  const handleLogoutOthers = async () => {
    setLogoutAllBusy(true);
    setSessionsError("");
    try {
      await api.logoutAll(false);
      await loadSessions();
    } catch (error) {
      setSessionsError(error instanceof Error ? error.message : "Unable to revoke other sessions.");
    } finally {
      setLogoutAllBusy(false);
    }
  };

  const handleLogoutAll = async () => {
    setLogoutAllBusy(true);
    setSessionsError("");
    try {
      await api.logoutAll(true);
    } catch {
      // logoutAll(true) already clears local tokens
    } finally {
      setLogoutAllBusy(false);
      onLogout();
    }
  };

  const formatSessionDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString();
  };

  const highlightSessionMatch = (value: string) => {
    const query = sessionSearch.trim();
    if (!query || !value) return value || "—";

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const parts = value.split(new RegExp(`(${escapedQuery})`, "ig"));

    return (
      <>
        {parts.map((part, index) => {
          if (part.toLowerCase() === query.toLowerCase()) {
            return (
              <mark key={`${part}-${index}`} className="bg-amber-200/80 text-[#1E2A4A] px-0.5 rounded-sm">
                {part}
              </mark>
            );
          }
          return <span key={`${part}-${index}`}>{part}</span>;
        })}
      </>
    );
  };

  const tabs: { key: AdminTab; label: string; icon: typeof Send; badge?: number }[] = [
    { key: "overview",    label: "Overview",    icon: Home },
    { key: "pending",     label: "Pending",     icon: FileText,   badge: totalPending },
    { key: "approved",   label: "Approved",    icon: CheckCircle },
    { key: "testimonies",label: "Testimonies", icon: Sparkles },
    { key: "accounts",   label: "Accounts",    icon: Users,      badge: users.length },
    { key: "sessions",   label: "Sessions",    icon: Smartphone },
    { key: "analytics",  label: "Analytics",   icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-[#F5F6FA]">
      {/* ── Admin Navbar ── */}
      <nav className="bg-[#1E2A4A] sticky top-0 z-50 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* brand */}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
                <ImageWithFallback src={prayingHandsLogo} alt="logo" className="w-6 h-6 object-contain" />
              </div>
              <span className="font-bold text-white text-base tracking-tight hidden sm:block">AY Prayerbox</span>
              <span className="ml-2 text-[10px] font-bold text-[#1E3A8A] bg-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wider">Admin</span>
            </div>

            {/* quick-stat pills */}
            <div className="hidden md:flex items-center gap-3 text-xs">
              <span className="bg-white/10 text-white px-3 py-1 rounded-full flex items-center gap-1.5">
                <Send size={11} /> {prayers.length} requests
              </span>
              <span className="bg-white/10 text-white px-3 py-1 rounded-full flex items-center gap-1.5">
                <Users size={11} /> {users.length} accounts
              </span>
              {totalPending > 0 && (
                <span className="bg-red-500 text-white px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                  <AlertTriangle size={11} /> {totalPending} pending
                </span>
              )}
            </div>

            {/* logout */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-medium transition-colors"
            >
              <LogOut size={14} /> <span className="hidden sm:block">Exit Admin</span>
            </button>
          </div>

          {/* tab strip */}
          <div className="flex gap-0.5 overflow-x-auto pb-0">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors",
                    tab === t.key
                      ? "border-amber-400 text-amber-300"
                      : "border-transparent text-white/50 hover:text-white/80"
                  )}
                >
                  <Icon size={13} />
                  {t.label}
                  {t.badge != null && t.badge > 0 && (
                    <span className={cn(
                      "ml-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center",
                      tab === t.key ? "bg-amber-400 text-[#1E2A4A]" : "bg-red-500 text-white"
                    )}>
                      {t.badge > 9 ? "9+" : t.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <AnimatePresence mode="wait">

          {/* ── Overview ── */}
          {tab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#1E2A4A]">Dashboard Overview</h2>
                <p className="text-[#7A85A3] text-sm mt-0.5">Everything happening in AY Prayerbox at a glance.</p>
              </div>

              {/* KPI grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { label: "Prayer Requests",   value: prayers.length,            icon: Send,          color: "text-[#1E3A8A] bg-[#EEF2FF]" },
                  { label: "Prayers Offered",   value: totalPrayers,              icon: HandHeart,     color: "text-purple-600 bg-purple-50" },
                  { label: "Testimonies",        value: approvedTestimonies.length,icon: Sparkles,      color: "text-amber-500 bg-amber-50" },
                  { label: "Pending Review",     value: totalPending,              icon: AlertTriangle, color: "text-red-500 bg-red-50" },
                  { label: "Registered Accounts",value: users.length,             icon: Users,         color: "text-emerald-600 bg-emerald-50" },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 2px 12px rgba(30,58,138,0.07)" }}>
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", s.color.split(" ")[1])}>
                        <Icon size={17} className={s.color.split(" ")[0]} />
                      </div>
                      <p className="text-2xl font-bold text-[#1E2A4A]">{s.value}</p>
                      <p className="text-[#7A85A3] text-xs mt-0.5">{s.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* recent pending + top prayers side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* pending queue */}
                <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-semibold text-[#1E2A4A]">Awaiting Review</p>
                    {totalPending > 0 && (
                      <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{totalPending} items</span>
                    )}
                  </div>
                  {totalPending === 0 ? (
                    <div className="text-center py-8 text-[#9AA3BC]">
                      <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">All caught up!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[...pendingPrayers.slice(0, 3), ...pendingTestimonies.slice(0, 2)].map((item) => (
                        <div key={item.id} className="flex items-start gap-3 p-3 bg-[#F5F6FA] rounded-xl">
                          <div className="w-7 h-7 rounded-full bg-[#EEF2FF] flex items-center justify-center text-xs font-bold text-[#1E3A8A] shrink-0 mt-0.5">
                            {item.name[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-[#1E2A4A] text-xs">{item.name}</p>
                            <p className="text-[#7A85A3] text-xs truncate">{"request" in item ? item.request : item.text}</p>
                          </div>
                          <button
                            onClick={() => "request" in item ? onApprovePrayer(item.id) : onApproveTestimony(item.id)}
                            className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg shrink-0"
                          >
                            Approve
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* top prayers */}
                <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                  <p className="font-semibold text-[#1E2A4A] mb-4">Most Prayed Requests</p>
                  {topPrayers.length === 0 ? (
                    <p className="text-sm text-[#9AA3BC] text-center py-8">No prayers yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {topPrayers.map((p, i) => (
                        <div key={p.id} className="flex items-center gap-3">
                          <span className="text-[11px] font-bold text-[#7A85A3] w-4 shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-[#1E2A4A] truncate">{p.name} — {p.category}</p>
                            <div className="mt-1 h-1.5 rounded-full bg-[#EEF2FF] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#1E3A8A]"
                                style={{ width: `${Math.round((p.prayerCount / (topPrayers[0]?.prayerCount || 1)) * 100)}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs font-bold text-[#1E3A8A] shrink-0">{p.prayerCount}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* category breakdown */}
              <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                <p className="font-semibold text-[#1E2A4A] mb-4">Prayer Requests by Category</p>
                <div className="space-y-3">
                  {Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-[#7A85A3] w-20 shrink-0">{cat}</span>
                      <div className="flex-1 h-2 rounded-full bg-[#EEF2FF] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#1E3A8A]"
                          style={{ width: `${Math.round((count / prayers.length) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-[#1E2A4A] w-6 text-right shrink-0">{count}</span>
                    </div>
                  ))}
                  {prayers.length === 0 && <p className="text-sm text-[#9AA3BC]">No data yet.</p>}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Pending ── */}
          {tab === "pending" && (
            <motion.div key="pending" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-[#1E2A4A]">Pending Review</h2>
                <p className="text-[#7A85A3] text-sm mt-0.5">Approve or remove content before it goes public.</p>
              </div>
              {pendingPrayers.length === 0 && pendingTestimonies.length === 0 ? (
                <div className="text-center py-20 text-[#9AA3BC]">
                  <CheckCircle size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="font-medium">All caught up! Nothing to review.</p>
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
                              <motion.button whileTap={{ scale: 0.95 }} onClick={() => onApprovePrayer(p.id)} className="flex-1 h-9 rounded-lg bg-green-500 text-white text-xs font-semibold flex items-center justify-center gap-1 min-w-0">
                                <Check size={12} /> Approve
                              </motion.button>
                              <motion.button whileTap={{ scale: 0.95 }} onClick={() => onToggleUrgent(p.id)} className="h-9 px-3 rounded-lg bg-orange-100 text-orange-600 text-xs font-semibold flex items-center justify-center gap-1">
                                <AlertTriangle size={12} /> Urgent
                              </motion.button>
                              <motion.button whileTap={{ scale: 0.95 }} onClick={() => onRejectPrayer(p.id)} className="h-9 px-3 rounded-lg bg-red-100 text-red-500 text-xs font-semibold flex items-center justify-center gap-1">
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
                              <motion.button whileTap={{ scale: 0.95 }} onClick={() => onApproveTestimony(t.id)} className="flex-1 h-9 rounded-lg bg-green-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
                                <Check size={12} /> Approve
                              </motion.button>
                              <motion.button whileTap={{ scale: 0.95 }} onClick={() => onRejectTestimony(t.id)} className="h-9 px-3 rounded-lg bg-red-100 text-red-500 text-xs font-semibold flex items-center justify-center gap-1">
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

          {/* ── Approved ── */}
          {tab === "approved" && (
            <motion.div key="approved" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-[#1E2A4A]">Approved Prayers</h2>
                <p className="text-[#7A85A3] text-sm mt-0.5">{approvedPrayers.length} live prayer request{approvedPrayers.length !== 1 ? "s" : ""}.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      <div className="flex items-center gap-1"><Users size={11} /> {p.prayerCount} prayed</div>
                      <button onClick={() => onRejectPrayer(p.id)} className="text-red-400 hover:text-red-600 transition-colors">
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                {approvedPrayers.length === 0 && <p className="text-sm text-[#9AA3BC] col-span-full text-center py-12">No approved prayers yet.</p>}
              </div>
            </motion.div>
          )}

          {/* ── Testimonies ── */}
          {tab === "testimonies" && (
            <motion.div key="testimonies" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-[#1E2A4A]">Testimonies</h2>
                <p className="text-[#7A85A3] text-sm mt-0.5">{approvedTestimonies.length} published testimon{approvedTestimonies.length !== 1 ? "ies" : "y"}.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {approvedTestimonies.map((t) => (
                  <div key={t.id} className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                    <Star size={13} className="text-amber-400 mb-2" />
                    <p className="text-[#2D3A5E] text-sm leading-relaxed mb-3 line-clamp-4">{t.text}</p>
                    <div className="flex items-center justify-between text-xs text-[#9AA3BC]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                          <span className="text-[9px] font-bold text-[#1E3A8A]">{t.name[0]}</span>
                        </div>
                        {t.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <span>{t.daysAgo}d ago</span>
                        <button onClick={() => onRejectTestimony(t.id)} className="text-red-400 hover:text-red-600 transition-colors">
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {approvedTestimonies.length === 0 && <p className="text-sm text-[#9AA3BC] col-span-full text-center py-12">No testimonies yet.</p>}
              </div>
            </motion.div>
          )}

          {/* ── Accounts ── */}
          {tab === "accounts" && (
            <motion.div key="accounts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[#1E2A4A]">Registered Accounts</h2>
                  <p className="text-[#7A85A3] text-sm mt-0.5">{users.length} account{users.length !== 1 ? "s" : ""} in the system.</p>
                </div>
                <div className="relative max-w-xs w-full sm:w-auto">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA3BC]" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full h-10 pl-9 pr-4 rounded-xl bg-white border border-[#EEF2FF] text-sm text-[#1E2A4A] placeholder-[#9AA3BC] outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                  />
                </div>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="text-center py-20 text-[#9AA3BC]">
                  <Users size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{users.length === 0 ? "No accounts created yet." : "No accounts match your search."}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-[#EEF2FF] flex items-center justify-center text-lg font-bold text-[#1E3A8A] overflow-hidden shrink-0">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                          ) : (
                            user.name?.[0]?.toUpperCase() || "U"
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[#1E2A4A] truncate">{user.name}</p>
                          <p className="text-xs text-[#7A85A3] truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5 mb-4 text-xs text-[#7A85A3]">
                        <div className="flex items-center gap-2">
                          <Phone size={12} className="shrink-0" />
                          <span>{user.phone || "No phone number"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <SparklesIcon size={12} className="shrink-0" />
                          <span>Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteUser(user.id)}
                        className="w-full h-8 rounded-lg bg-red-50 text-red-500 text-xs font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                      >
                        <X size={12} /> Delete Account
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Sessions ── */}
          {tab === "sessions" && (
            <motion.div key="sessions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[#1E2A4A]">Session Management</h2>
                  <p className="text-[#7A85A3] text-sm mt-0.5">Review active devices and revoke compromised sessions.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadSessions().catch(() => {})}
                    disabled={sessionsLoading || logoutAllBusy}
                    className="h-9 px-3 rounded-lg bg-white border border-[#E5EAF7] text-xs font-semibold text-[#1E2A4A] disabled:opacity-50"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={handleLogoutOthers}
                    disabled={sessionsLoading || logoutAllBusy}
                    className="h-9 px-3 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold disabled:opacity-50"
                  >
                    Revoke Others
                  </button>
                  <button
                    onClick={handleLogoutAll}
                    disabled={sessionsLoading || logoutAllBusy}
                    className="h-9 px-3 rounded-lg bg-red-50 text-red-600 text-xs font-semibold disabled:opacity-50"
                  >
                    Logout All
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-[#7A85A3] uppercase tracking-wider flex items-center gap-1">
                    <Filter size={12} /> Filter
                  </span>
                  {[
                    { key: "active" as SessionFilter, label: "Active" },
                    { key: "revoked" as SessionFilter, label: "Revoked" },
                    { key: "all" as SessionFilter, label: "All" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setSessionFilter(f.key)}
                      className={cn(
                        "h-8 px-3 rounded-lg text-xs font-semibold border transition-colors",
                        sessionFilter === f.key
                          ? "bg-[#1E3A8A] border-[#1E3A8A] text-white"
                          : "bg-white border-[#E5EAF7] text-[#1E2A4A]"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setSessionCurrentFirst((value) => !value)}
                  className={cn(
                    "h-8 px-3 rounded-lg text-xs font-semibold border self-start sm:self-auto",
                    sessionCurrentFirst
                      ? "bg-[#EEF2FF] border-[#C9D6FF] text-[#1E3A8A]"
                      : "bg-white border-[#E5EAF7] text-[#7A85A3]"
                  )}
                >
                  {sessionCurrentFirst ? "Current First: On" : "Current First: Off"}
                </button>
              </div>

              <div className="relative max-w-sm w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA3BC]" />
                <input
                  type="text"
                  placeholder="Search ID, IP, or user agent..."
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-xl bg-white border border-[#EEF2FF] text-sm text-[#1E2A4A] placeholder-[#9AA3BC] outline-none focus:ring-2 focus:ring-[#1E3A8A]/20"
                />
              </div>

              <div className="text-xs text-[#7A85A3]">
                Showing {sortedSessions.length === 0 ? 0 : (sessionPage - 1) * sessionsPerPage + 1}
                -{Math.min(sessionPage * sessionsPerPage, sortedSessions.length)} of {sortedSessions.length} session{sortedSessions.length !== 1 ? "s" : ""}
              </div>

              {sessionsError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {sessionsError}
                </div>
              )}

              {sessionsLoading ? (
                <div className="text-center py-20 text-[#9AA3BC]">
                  <Loader2 size={30} className="mx-auto mb-3 animate-spin" />
                  <p className="text-sm">Loading sessions...</p>
                </div>
              ) : sortedSessions.length === 0 ? (
                <div className="text-center py-20 text-[#9AA3BC]">
                  <Smartphone size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No sessions in this filter.</p>
                </div>
              ) : (
                <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paginatedSessions.map((session) => (
                    <div key={session.id} className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] text-[#1E3A8A] flex items-center justify-center">
                            <Smartphone size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#1E2A4A]">{session.current ? "Current Device" : "Device Session"}</p>
                            <p className="text-[11px] text-[#7A85A3]">ID: {highlightSessionMatch(session.id)}</p>
                          </div>
                        </div>
                        {session.current && (
                          <span className="text-[10px] font-bold text-[#1E3A8A] bg-[#EEF2FF] px-2 py-1 rounded-full">Current</span>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs text-[#7A85A3] mb-4">
                        <p><span className="font-semibold">Created:</span> {formatSessionDate(session.createdAt)}</p>
                        <p><span className="font-semibold">Last Used:</span> {formatSessionDate(session.lastUsedAt)}</p>
                        <p><span className="font-semibold">Expires:</span> {formatSessionDate(session.expiresAt)}</p>
                        <p><span className="font-semibold">IP:</span> {highlightSessionMatch(session.ipAddress || "—")}</p>
                        <p className="line-clamp-2"><span className="font-semibold">Agent:</span> {highlightSessionMatch(session.userAgent || "—")}</p>
                        {session.revokedAt && (
                          <p className="text-red-500"><span className="font-semibold">Revoked:</span> {formatSessionDate(session.revokedAt)}</p>
                        )}
                      </div>

                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        disabled={Boolean(session.revokedAt) || sessionBusyId === session.id}
                        className="w-full h-8 rounded-lg bg-red-50 text-red-600 text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {sessionBusyId === session.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                        {session.revokedAt ? "Already Revoked" : "Revoke Session"}
                      </button>
                    </div>
                  ))}
                </div>

                {totalSessionPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setSessionPage((page) => Math.max(1, page - 1))}
                      disabled={sessionPage === 1}
                      className="h-8 px-3 rounded-lg bg-white border border-[#E5EAF7] text-xs font-semibold text-[#1E2A4A] disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-xs font-semibold text-[#7A85A3]">
                      Page {sessionPage} of {totalSessionPages}
                    </span>
                    <button
                      onClick={() => setSessionPage((page) => Math.min(totalSessionPages, page + 1))}
                      disabled={sessionPage === totalSessionPages}
                      className="h-8 px-3 rounded-lg bg-white border border-[#E5EAF7] text-xs font-semibold text-[#1E2A4A] disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
                </>
              )}
            </motion.div>
          )}

          {/* ── Analytics ── */}
          {tab === "analytics" && (
            <motion.div key="analytics" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-[#1E2A4A]">Analytics</h2>
                <p className="text-[#7A85A3] text-sm mt-0.5">Detailed metrics and engagement data.</p>
              </div>

              {/* metric cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  { label: "Answered Prayer Rate",   value: `${approvedTestimonies.length} / ${prayers.length}`,         sub: "requests with testimonies",          icon: TrendingUp,    color: "text-green-600 bg-green-50" },
                  { label: "Most Active Category",   value: topCategory,                                                   sub: "by number of requests",               icon: Star,          color: "text-amber-500 bg-amber-50" },
                  { label: "Community Prayer Total", value: totalPrayers.toLocaleString(),                                 sub: "prayers offered across all requests", icon: HandHeart,     color: "text-purple-600 bg-purple-50" },
                  { label: "Urgent Requests",        value: prayers.filter((p) => p.urgent).length.toString(),            sub: "flagged for urgent prayer",           icon: AlertTriangle, color: "text-red-500 bg-red-50" },
                  { label: "Approval Rate",          value: `${prayers.length ? Math.round((approvedPrayers.length / prayers.length) * 100) : 0}%`, sub: "requests approved vs submitted", icon: CheckCircle, color: "text-[#1E3A8A] bg-[#EEF2FF]" },
                  { label: "Avg. Prayers per Request", value: prayers.length ? (totalPrayers / prayers.length).toFixed(1) : "0", sub: "average engagement per request", icon: Users, color: "text-emerald-600 bg-emerald-50" },
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

              {/* category bar chart */}
              <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <p className="font-semibold text-[#1E2A4A] mb-5">Requests by Category</p>
                <div className="space-y-4">
                  {Object.entries(categoryMap).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                    <div key={cat} className="flex items-center gap-4">
                      <span className="text-xs font-semibold text-[#7A85A3] w-20 shrink-0">{cat}</span>
                      <div className="flex-1 h-3 rounded-full bg-[#EEF2FF] overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.round((count / prayers.length) * 100)}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full bg-[#1E3A8A]"
                        />
                      </div>
                      <span className="text-xs font-bold text-[#1E2A4A] w-8 text-right shrink-0">{count}</span>
                    </div>
                  ))}
                  {prayers.length === 0 && <p className="text-sm text-[#9AA3BC]">No data yet.</p>}
                </div>
              </div>

              {/* top prayers leaderboard */}
              <div className="bg-white rounded-2xl p-6" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <p className="font-semibold text-[#1E2A4A] mb-5">Top 5 Most Prayed Requests</p>
                {topPrayers.length === 0 ? (
                  <p className="text-sm text-[#9AA3BC]">No prayers recorded yet.</p>
                ) : (
                  <div className="space-y-4">
                    {topPrayers.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-4">
                        <span className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                          i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-[#1E2A4A]" : "bg-[#EEF2FF] text-[#7A85A3]"
                        )}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#1E2A4A] truncate">{p.name}</p>
                          <p className="text-xs text-[#7A85A3] truncate">{p.request}</p>
                          <div className="mt-1.5 h-1.5 rounded-full bg-[#EEF2FF] overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.round((p.prayerCount / (topPrayers[0]?.prayerCount || 1)) * 100)}%` }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              className="h-full rounded-full bg-[#1E3A8A]"
                            />
                          </div>
                        </div>
                        <span className="text-sm font-bold text-[#1E3A8A] shrink-0">{p.prayerCount}</span>
                      </div>
                    ))}
                  </div>
                )}
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
  const [accountMode, setAccountMode] = useState<"signin" | "signup">("signin");

  const isAdmin = currentUser?.role === "admin";

  const adminRestrictedScreens: Screen[] = [
    "splash",
    "onboarding",
    "submit",
    "success",
    "share",
    "pray",
    "testimonies",
    "account",
    "settings",
    "admin-login",
  ];

  const navigate = (s: Screen) => {
    if (isAdmin && adminRestrictedScreens.includes(s)) {
      setScreen("admin-dashboard");
      return;
    }
    setScreen(s);
  };
  const openAccount = (mode: "signin" | "signup") => {
    setAccountMode(mode);
    navigate("account");
  };

  useEffect(() => {
    applyAppearanceSettings(loadAppearanceSettings());
  }, []);

  const syncOfflineFromBrowser = () => {
    if (typeof navigator !== "undefined") {
      setOffline(!navigator.onLine);
    }
  };

  const refreshState = async () => {
    const state = await api.getState();
    setPrayers(state.prayers);
    setTestimonies(state.testimonies);
    setUsers(Array.isArray(state.users) ? state.users : []);
    setApiNotice("");
    setOffline(false);
  };

  useEffect(() => {
    syncOfflineFromBrowser();

    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (api.getAuthToken()) {
      api.getCurrentUser()
        .then((result) => {
          setCurrentUser(result.user);
        })
        .catch(() => {
          api.clearAuthToken();
          setCurrentUser(null);
        });
    }

    refreshState().catch(() => {
      syncOfflineFromBrowser();
      setApiNotice(
        typeof navigator !== "undefined" && navigator.onLine
          ? "Backend is unavailable. Connect this site to your API to enable live data."
          : "No internet connection. Showing the last available local experience."
      );
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Auto-refresh every 10 seconds while the admin dashboard is open
  useEffect(() => {
    if (screen !== "admin-dashboard") return;
    const id = window.setInterval(() => {
      refreshState().catch(() => {});
    }, 10_000);
    return () => window.clearInterval(id);
  }, [screen]);

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

  useEffect(() => {
    if (isAdmin && screen !== "admin-dashboard") {
      setScreen("admin-dashboard");
    }
  }, [isAdmin, screen]);

  const handleSubmitPrayer = async (name: string, request: string, category: Category) => {
    if (isAdmin) {
      setApiNotice("Admin accounts cannot submit prayer requests.");
      navigate("admin-dashboard");
      return;
    }
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
    if (isAdmin) {
      setApiNotice("Admin accounts cannot submit testimonies.");
      navigate("admin-dashboard");
      return;
    }
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
    navigate(user.role === "admin" ? "admin-dashboard" : "submit");
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

  const handleLogout = () => {
    api.logout().catch(() => {
      api.clearAuthToken();
    }).finally(() => {
      setCurrentUser(null);
      setApiNotice("");
      navigate("submit");
    });
  };

  const navActive = (): string => {
    if (screen === "submit" || screen === "success") return "submit";
    if (screen === "pray") return "pray";
    if (screen === "testimonies") return "testimonies";
    return "";
  };

  const showNav = !isAdmin && !["splash", "onboarding", "admin-login", "admin-dashboard", "account", "settings", "share"].includes(screen);

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

      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {screen === "splash" && (showSplash ? <SplashLoadingScreen onFinish={() => { setShowSplash(false); navigate(isAdmin ? "admin-dashboard" : currentUser ? "submit" : "onboarding"); }} /> : <SplashScreen onStart={() => navigate("submit")} onPray={() => navigate("pray")} prayers={prayers} testimonies={testimonies} />)}
          {screen === "onboarding" && <OnboardingScreen onCreateAccount={() => openAccount("signup")} onLogin={() => openAccount("signin")} onSkip={() => navigate("submit")} />}
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
              initialMode={accountMode}
              onAuthenticated={handleAuthSuccess}
              onLogout={handleLogout}
              onBack={() => navigate("submit")}
              onOpenAdmin={() => navigate("admin-login")}
            />
          )}
          {screen === "settings" && (
            <SettingsScreen
              onBack={() => navigate("submit")}
              onLogout={handleLogout}
              currentUser={currentUser}
              onUpdateCurrentUser={(updates) => {
                setCurrentUser((prev) => (prev ? { ...prev, ...updates } : prev));
              }}
              onApplyAppearance={applyAppearanceSettings}
            />
          )}
          {screen === "admin-login" && (
            <AdminLoginScreen
              onLogin={(user) => {
                setCurrentUser(user);
                setApiNotice("");
                navigate("admin-dashboard");
                refreshState().catch(() => {});
              }}
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
              onLogout={handleLogout}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
