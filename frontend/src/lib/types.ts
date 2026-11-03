export type ModelClass = {
  id: number;
  name: string;
};

export type Health = {
  status: string;
  model_loaded: boolean;
  model_error: string | null;
  weights_file: string;
  classes: ModelClass[];
  threshold: number;
  detect_floor: number;
  bin_capacity: number;
};

export type RuleClass = {
  key: string;
  label: string;
  bin: string;
  points: number;
};

export type Rules = {
  threshold: number;
  detect_floor: number;
  bin_capacity: number;
  classes: RuleClass[];
  note: string;
};

export type Prediction = {
  scan_id: number;
  accepted: boolean;
  reason: "low_confidence" | "unknown_class" | "no_detection" | null;
  message: string;
  threshold: number;
  display_name: string;
  class_id: number | null;
  class_name: string | null;
  label: string | null;
  confidence: number | null;
  bin: string | null;
  points: number;
  box: [number, number, number, number] | null;
  image_width: number;
  image_height: number;
  extra_boxes: number;
};

export type Scan = {
  id: number;
  display_name: string;
  canonical: string | null;
  class_name: string | null;
  label: string | null;
  confidence: number | null;
  bin_name: string | null;
  points: number;
  accepted: boolean;
  reason: string | null;
  box: [number, number, number, number] | null;
  image_width: number | null;
  image_height: number | null;
  extra_boxes: number;
  created_at: string;
};

export type ClassCount = {
  key: string;
  label: string;
  count: number;
};

export type BinStatus = ClassCount & {
  bin: string;
  capacity: number;
  fill: number;
};

export type Stats = {
  scope: "user" | "all";
  display_name: string | null;
  scans_total: number;
  accepted: number;
  rejected: number;
  points: number;
  by_class: ClassCount[];
  bins: BinStatus[];
  bin_capacity: number;
};

export type Leaderboard = {
  entries: {
    display_name: string;
    points: number;
    accepted_scans: number;
  }[];
};

export type MetricRow = {
  class_name: string;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  map50: number | null;
  map50_95: number | null;
  test_images: number | null;
  top1: number | null;
};

export type Confusion = {
  row_labels: string[];
  column_labels: string[];
  matrix: number[][];
};

export type Metrics = {
  available: boolean;
  message: string;
  rows: MetricRow[];
  confusion: Confusion | null;
  source: string | null;
};
