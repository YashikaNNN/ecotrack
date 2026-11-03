import { TextLink } from "@/components/ui";

const MATERIALS = [
  {
    name: "Plastic",
    source: "TrashNet",
    bin: "Dry recyclable — plastic",
  },
  {
    name: "Paper",
    source: "TrashNet paper and cardboard",
    bin: "Dry recyclable — paper",
  },
  {
    name: "Metal",
    source: "TrashNet",
    bin: "Dry recyclable — metal",
  },
  {
    name: "Organic",
    source: "Kaggle waste-classification collection",
    bin: "Organic / wet waste",
  },
  {
    name: "E-waste",
    source: "Source still to be confirmed in the reports",
    bin: "Separate e-waste collection",
  },
];

const STEPS = [
  {
    n: "01",
    title: "One photo",
    text: "Upload a picture or capture a frame. The useful case is a single, clearly visible item.",
  },
  {
    n: "02",
    title: "YOLOv8n names the material",
    text: "The checkpoint returns a class and a confidence score. It was trained to tell materials apart, using one box that covers most of each photo.",
  },
  {
    n: "03",
    title: "A rule picks the bin",
    text: "If confidence is at least 50%, a fixed lookup adds the bin and the awareness points, then stores the scan.",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="grid items-start gap-10 lg:grid-cols-[1.35fr_0.75fr]">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-brass">
            EcoNex · MCA (AI/DS)
          </p>
          <h1 className="mt-3 max-w-xl font-serif text-5xl leading-[1.05] tracking-tight sm:text-6xl">
            Which bin does this item belong in?
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            EcoTrack takes one waste photo, asks a fine-tuned YOLOv8n model
            which of five materials it shows, and turns that class into a bin
            and a stored record.
          </p>
          <div className="mt-8">
            <TextLink href="/scan">Scan an item</TextLink>
          </div>
        </div>
        <aside className="border border-line bg-card p-6">
          <h2 className="font-serif text-2xl tracking-tight">From photo to record</h2>
          <ol className="mt-5 space-y-5">
            {STEPS.map((step) => (
              <li key={step.n} className="grid grid-cols-[auto_1fr] gap-4">
                <span className="font-serif text-lg text-brass">{step.n}</span>
                <div>
                  <p className="font-medium">{step.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </section>

      <section className="mt-16">
        <h2 className="font-serif text-3xl tracking-tight">Five materials</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          These are the classes the proposal committed to. The running
          checkpoint reports its own class list on the scan page once{" "}
          <span className="font-medium text-ink">best.pt</span> is loaded.
          TrashNet glass and generic trash were left out on purpose.
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {MATERIALS.map((item) => (
            <li key={item.name} className="border border-line bg-card p-4">
              <p className="font-serif text-xl">{item.name}</p>
              <p className="mt-3 text-sm leading-relaxed text-ink">{item.bin}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted">{item.source}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-2">
        <div className="border border-line bg-card p-6">
          <h2 className="font-serif text-2xl tracking-tight">What you can do here</h2>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
            <li>Check one photo and read the class, confidence, and bin.</li>
            <li>Keep a history of attempts under your name.</li>
            <li>See category counts, simulated bin levels, and points from those scans.</li>
          </ul>
        </div>
        <div className="border border-line bg-card p-6">
          <h2 className="font-serif text-2xl tracking-tight">Limits of this version</h2>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
            <li>The model expects one main item. It was not trained on hand-drawn boxes around several objects.</li>
            <li>A low-confidence photo does not award points or fill a bin.</li>
            <li>Bin levels are counts of accepted scans, divided by a capacity of 20.</li>
            <li>Points are awareness scores. The reports do not define a carbon calculation, so this app does not show one.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
