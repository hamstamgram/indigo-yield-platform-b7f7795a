/**
 * UI Hooks - Barrel Export
 * Hooks for UI-related functionality
 */

// Mobile detection
export { useIsMobile } from "./use-mobile";

// Toast notifications
export { useToast, toast } from "./use-toast";

// Navigation
export { useBreadcrumbs, type BreadcrumbItem } from "./useBreadcrumbs";

// URL state
export { useUrlFilters, type UseUrlFiltersOptions } from "./useUrlFilters";

// Table sorting
export { useSortableColumns, type SortDirection, type SortConfig } from "./useSortableColumns";

// Keyboard shortcuts
export { useKeyboardShortcuts, SHORTCUTS, formatShortcut } from "./useKeyboardShortcuts";

// Debounce
export { useDebounce } from "./useDebounce";

// Focus management
export { useFocusManagement } from "./useFocusManagement";

// Inline management toggle
export { useInlineManagementToggle } from "./useInlineManagementToggle";

// Intersection observer
export { useIntersectionObserver } from "./useIntersectionObserver";

// Local storage
export { useLocalStorage } from "./useLocalStorage";

// Optimized callback
export { useOptimizedCallback } from "./useOptimizedCallback";
