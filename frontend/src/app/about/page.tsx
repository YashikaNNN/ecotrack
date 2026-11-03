import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "About" };

const TEAM = [
  ["Anshvika Kohli", "Team lead", "2520560046"],
  ["Anubhi Sharma", "Member", "2520560049"],
  ["Rimjhim Saxena", "Member", "2520560053"],
  ["Yashika Nagpal", "Member", "2520560067"],
];

export default function AboutPage() {
  return (
    <div>
      <PageHeader
        kicker="Project"
        title="EcoTrack"
        lede="An academic prototype for sorting one photographed item into plastic, paper, metal, organic waste, or e-waste, then keeping a record of that choice."
      />

      <section className="border border-line bg-card p-5">
        <h2 className="font-serif text-2xl tracking-tight">Why it exists</h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          Mixed waste is expensive to separate again, and a printed label does not help when the person cannot tell what they are holding. EcoTrack asks a computer-vision model to make that first call, then stores the event so a person can see what they have sorted. Hardware sensors are left for a later version. The bins in this app are simulated.
        </p>
      </section>

      <section className="mt-6 border border-line bg-card p-5">
        <h2 className="font-serif text-2xl tracking-tight">Team EcoNex</h2>
        <p className="mt-2 text-sm text-muted">MCA (AI/DS), project code ML-III-2026-T002.</p>
        <table className="mt-4 w-full text-left text-sm">
          <caption className="sr-only">Team members from the project proposal</caption>
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Role</th>
              <th className="py-2 font-medium">Student ID</th>
            </tr>
          </thead>
          <tbody>
            {TEAM.map(([name, role, id]) => (
              <tr key={id} className="border-b border-line last:border-0">
                <td className="py-2">{name}</td>
                <td className="py-2">{role}</td>
                <td className="py-2 tabular-nums">{id}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          The proposal lists Anubhi Sharma as the second member. The Phase 2 progress report lists Shreyansh Tiwari in that seat, with the same student ID. Email addresses from the reports are left off this page.
        </p>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="border border-line bg-card p-5">
          <h2 className="font-serif text-2xl tracking-tight">Datasets named in the plan</h2>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
            <li>TrashNet (Yang and Thung, 2016) for plastic, paper with cardboard, and metal. Glass and generic trash are excluded.</li>
            <li>A Kaggle waste-classification collection for organic waste. The exact set, licence, and image counts are still marked “to be confirmed”.</li>
            <li>An e-waste set from Kaggle or Roboflow, also unconfirmed.</li>
            <li>TACO is cited as related work. The reports do not say the model was trained on it.</li>
          </ul>
        </div>
        <div className="border border-line bg-card p-5">
          <h2 className="font-serif text-2xl tracking-tight">Works the reports cite</h2>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
            <li>Redmon et al., 2016. You Only Look Once. CVPR.</li>
            <li>Ultralytics YOLO documentation.</li>
            <li>Lin et al., 2014. Microsoft COCO. ECCV.</li>
            <li>Yang and Thung, 2016. TrashNet. Stanford CS229.</li>
            <li>Proença and Simões, 2020. TACO. arXiv:2003.06975.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
