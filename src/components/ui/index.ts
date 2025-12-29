/**
 * UI Components Barrel Export
 * Single import point for all UI components
 *
 * Usage: import { Button, Card, Input } from "@/components/ui";
 */

// Accordion
export { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

// Alert
export { Alert, AlertDescription, AlertTitle } from "./alert";

// Alert Dialog
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

// Aspect Ratio
export { AspectRatio } from "./aspect-ratio";

// Avatar
export { Avatar, AvatarFallback, AvatarImage } from "./avatar";

// Badge
export { Badge, badgeVariants } from "./badge";

// Breadcrumb
export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";

// Button
export { Button, buttonVariants } from "./button";

// Calendar
export { Calendar } from "./calendar";
export type { CalendarProps } from "./calendar";

// Card
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

// Carousel
export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "./carousel";

// Chart
export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./chart";

// Checkbox
export { Checkbox } from "./checkbox";

// Collapsible
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";

// Command
export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command";

// Context Menu
export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./context-menu";

// Date Range Picker
export { DatePickerWithRange } from "./date-range-picker";

// Dialog
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

// Drawer
export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";

// Dropdown Menu
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";

// Email Chips Input
export { EmailChipsInput } from "./email-chips-input";

// Empty State
export { EmptyState } from "./empty-state";

// Form
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "./form";

// Hover Card
export { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card";

// Input
export { Input } from "./input";
export type { InputProps } from "./input";

// Input OTP
export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "./input-otp";

// Label
export { Label } from "./label";

// Loading Components
export { LoadingSpinner, PageLoadingSpinner } from "./loading-spinner";
export type { LoadingSpinnerProps } from "./loading-spinner";

export {
  CardSkeleton,
  ChartSkeleton,
  DashboardSkeleton,
  FormSkeleton,
  ListSkeleton,
  ProfileSkeleton,
  Skeleton as LoadingSkeleton,
  TableSkeleton,
  TextSkeleton,
} from "./loading-skeletons";

export {
  AdminLoading,
  DashboardLoading,
  PageLoading,
  PortfolioLoading,
  RouteLoading,
  SuspenseWrapper,
  TransactionLoading,
} from "./loading-states";

// Menubar
export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "./menubar";

// Navigation Menu
export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
  navigationMenuTriggerStyle,
} from "./navigation-menu";

// Optimized Image
export { OptimizedImage, preloadImage } from "./optimized-image";

// Optimized Table
export { OptimizedTable } from "./optimized-table";
export type { Column, OptimizedTableProps } from "./optimized-table";

// Pagination
export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";

// Popover
export { Popover, PopoverContent, PopoverTrigger } from "./popover";

// Progress
export { Progress } from "./progress";

// Radio Group
export { RadioGroup, RadioGroupItem } from "./radio-group";

// Resizable
export { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./resizable";

// Responsive Table
export { ResponsiveTable } from "./responsive-table";
export type { ResponsiveTableColumn } from "./responsive-table";

// Role Gate
export { AdminOnly, AuthenticatedOnly, RoleGate, useRoleCheck, withRoleProtection } from "./RoleGate";

// Route Loading Fallback
export {
  AdminLoadingFallback,
  DashboardLoadingFallback,
  FormLoadingFallback,
  RouteLoadingFallback,
} from "./RouteLoadingFallback";

// Scroll Area
export { ScrollArea, ScrollBar } from "./scroll-area";

// Select
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

// Separator
export { Separator } from "./separator";

// Sheet
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

// Sidebar
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "./sidebar";

// Skeleton
export { Skeleton } from "./skeleton";

// Slider
export { Slider } from "./slider";

// Sonner
export { Toaster as SonnerToaster, toast as sonnerToast } from "./sonner";

// Sortable Table Head
export { SortableTableHead } from "./sortable-table-head";

// Switch
export { Switch } from "./switch";

// Table
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";

// Tabs
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

// Textarea
export { Textarea } from "./textarea";
export type { TextareaProps } from "./textarea";

// Toast
export {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  type ToastActionElement,
  type ToastProps,
} from "./toast";
export { Toaster } from "./toaster";

// Toggle
export { Toggle, toggleVariants } from "./toggle";

// Toggle Group
export { ToggleGroup, ToggleGroupItem } from "./toggle-group";

// Tooltip
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

// Truncated Text
export { TruncatedText } from "./truncated-text";

// Trust Indicator
export { default as TrustIndicator, TrustIndicatorCompact } from "./trust-indicator";
export type { TrustIndicatorProps } from "./trust-indicator";
