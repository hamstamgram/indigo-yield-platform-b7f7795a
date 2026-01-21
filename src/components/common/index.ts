/**
 * Common Components
 * Shared UI components used across the application
 */

// Display components
export { AssetPerformanceCard } from "./AssetPerformanceCard";
export { default as KPI } from "./KPI";

// Formatting components
export { 
  FinancialValue, 
  sumFinancialValues, 
  financialValuesEqual 
} from "./FinancialValue";

export { 
  FormattedNumber,
  AUMValue,
  PercentageValue,
  TokenValue,
  type FormattedNumberType,
  type FormattedNumberProps,
} from "./FormattedNumber";

// Form components
export { NumericInput } from "./NumericInput";

// Activity Feed
export { 
  ActivityFeed, 
  type ControlledActivityItem 
} from "./ActivityFeed";

// Status display
export { 
  StatusBadge,
  type StatusBadgeProps,
} from "./StatusBadge";

// Data display
export {
  DataCard,
  DataCardGrid,
  type DataCardProps,
} from "./DataCard";
