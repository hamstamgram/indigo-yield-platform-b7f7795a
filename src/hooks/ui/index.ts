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
export { useTabFromUrl } from "./useTabFromUrl";

// Table sorting
export { useSortableColumns, type SortDirection, type SortConfig } from "./useSortableColumns";

// Keyboard shortcuts
export { useKeyboardShortcuts, SHORTCUTS, formatShortcut } from "./useKeyboardShortcuts";

// Debounce
export { useDebounce } from "./useDebounce";

// Focus management
export { useFocusManagement } from "./useFocusManagement";

// Local storage
export { useLocalStorage } from "./useLocalStorage";
