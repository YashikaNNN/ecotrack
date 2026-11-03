import type { Metadata } from "next";
import { ScanStudio } from "@/components/ScanStudio";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Scan" };

export default function ScanPage() {
  return (
    <div>
      <PageHeader
        kicker="Prediction"
        title="Check one item"
        lede="The photo is sent to the trained YOLOv8n checkpoint. The bin and the points come from fixed rules after the class is known."
      />
      <ScanStudio />
    </div>
  );
}
