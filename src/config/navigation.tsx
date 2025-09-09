
import React from "react";
import { 
  Home, 
  Users, 
  Database, 
  Settings, 
  Shield, 
  User, 
  LayoutDashboard,
  Percent,
  TrendingDown
} from "lucide-react";
import { CryptoIcon } from "@/components/CryptoIcons";
import { NavItem } from "@/types/navigation";

// Admin navigation menu
export const adminNav: NavItem[] = [
  { title: "Admin Dashboard", href: "/admin", icon: <LayoutDashboard className="h-5 w-5" />, adminOnly: true },
  { title: "Investor Management", href: "/admin/investors", icon: <Users className="h-5 w-5" />, adminOnly: true },
  { title: "Withdrawals", href: "/admin/withdrawals", icon: <TrendingDown className="h-5 w-5" />, adminOnly: true },
  { title: "Yield Settings", href: "/admin/yield-settings", icon: <Percent className="h-5 w-5" />, adminOnly: true },
  { title: "Portfolio Management", href: "/admin-tools", icon: <Database className="h-5 w-5" />, adminOnly: true },
];

// Main navigation menu
export const mainNav: NavItem[] = [
  { title: "Overview", href: "/dashboard", icon: <Home className="h-5 w-5" /> },
  { title: "Bitcoin", href: "/assets/btc", icon: <CryptoIcon symbol="btc" className="h-5 w-5" /> },
  { title: "Ethereum", href: "/assets/eth", icon: <CryptoIcon symbol="eth" className="h-5 w-5" /> },
  { title: "Solana", href: "/assets/sol", icon: <CryptoIcon symbol="sol" className="h-5 w-5" /> },
  { title: "USDC", href: "/assets/usdc", icon: <CryptoIcon symbol="usdc" className="h-5 w-5" /> },
];

// Account navigation menu
export const accountNav: NavItem[] = [
  { title: "Account", href: "/account", icon: <User className="h-5 w-5" /> },
  { title: "Settings", href: "/settings", icon: <Settings className="h-5 w-5" /> },
];
