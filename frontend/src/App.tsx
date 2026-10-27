import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Boxes,
  Brain,
  Check,
  ChevronRight,
  CircleHelp,
  Database,
  FlaskConical,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Upload,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  api,
  download,
  getApiOrigin,
  json,
  percent,
  setApiOrigin,
  setToken,
} from "./api";
import { BrainView, Slice } from "./BrainView";

type Dataset = {
  id: string;
  name: string;
  kind: string;
  details: any;
  created?: number;
  checksum?: string;
};
type Job = {
  id: string;
  dataset_id: string;
  status: string;
  created: number;
  result: any;
};
const pages = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Datasets", icon: Database },
  { name: "Brain viewer", icon: Brain },
  { name: "Model evaluation", icon: Activity },
  { name: "Experiments", icon: History },
  { name: "Research library", icon: BookOpen },
  { name: "Settings", icon: Settings },
];

export default function App() {
  const [signed, setSigned] = useState(false),
    [password, setPassword] = useState(""),
    [serverOrigin, setServerOrigin] = useState(getApiOrigin),
    [page, setPage] = useState("Overview");
  const [datasets, setDatasets] = useState<Dataset[]>([]),
    [jobs, setJobs] = useState<Job[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false),
    [consent, setConsent] = useState(false),
    [query, setQuery] = useState(""),
    [theme, setTheme] = useState(
      localStorage.getItem("neuromap-theme") || "dark",
    ),
    [mobile, setMobile] = useState(false);
  const [selected, setSelected] = useState(""),
    [selectedJob, setSelectedJob] = useState(""),
    [volume, setVolume] = useState<any>(null),
    [axis, setAxis] = useState(2),
    [index, setIndex] = useState(-1),
    [rotate, setRotate] = useState(false),
    [threshold, setThreshold] = useState(0.25);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("neuromap-theme", theme);
  }, [theme]);
  useEffect(() => {
    if (!uploading) return;
    const previous = document.activeElement as HTMLElement | null;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setUploading(false);
        return;
      }
      if (event.key !== "Tab") return;
      const targets = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[role="dialog"] button:not(:disabled),[role="dialog"] input:not(:disabled),[role="dialog"] a[href]',
        ),
      );
      const first = targets[0],
        last = targets.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [uploading]);
  const refresh = useCallback(async () => {
    const [d, j] = await Promise.all([
      json("/datasets?limit=100"),
      json("/jobs"),
    ]);
    setDatasets(d);
    setJobs(j);
  }, []);
  useEffect(() => {
    if (!signed) return;
    refresh().catch((e) => setError(e.message));
    const timer = setInterval(
      () => refresh().catch((e) => setError(e.message)),
      3000,
    );
    return () => clearInterval(timer);
  }, [signed, refresh]);
  useEffect(() => {
    if (!signed || !selected) {
      setVolume(null);
      return;
    }
    let live = true;
    json(`/datasets/${selected}/volume?axis=${axis}&index=${index}`)
      .then((v) => {
        if (live) setVolume(v);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [signed, selected, axis, index]);
  const act = async (fn: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  };
  const navigate = (name: string) => {
    setPage(name);
    setMobile(false);
    setNotice("");
  };
  const start = async (d: Dataset) => {
    const j = await json("/jobs", {
      method: "POST",
      body: JSON.stringify({
        dataset_id: d.id,
        idempotency_key: crypto.randomUUID(),
      }),
    });
    setSelectedJob(j.id);
    await refresh();
    navigate("Experiments");
    setNotice("Analysis submitted. Status updates automatically.");
  };
  const demo = () =>
    act(async () => {
      const d = await json("/demo", { method: "POST" });
      await refresh();
      setSelected(d.find((x: Dataset) => x.kind === "nifti").id);
      setNotice(
        "Two synthetic datasets created. Select Run analysis to compute results.",
      );
    });
  const latest =
    jobs.find((j) => j.id === selectedJob && j.result.metrics) ||
    jobs.find((j) => j.status === "completed" && j.result.metrics);
  const result = latest?.result;
  const filtered = datasets.filter((d) =>
    d.name.toLowerCase().includes(query.toLowerCase()),
  );
  const image = datasets.find((d) => d.id === selected);
  const report = (id: string) =>
    act(async () => {
      await download(`/jobs/${id}/report`, `neuromap-${id}.json`);
    });
  const datasetTable = (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Dataset</th>
            <th>Format / contents</th>
            <th>Provenance</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((d) => (
            <tr key={d.id}>
              <td>
                <span className={`file-icon ${d.kind}`}>
                  <Database size={16} />
                </span>
                <strong>{d.name}</strong>
                <small>
                  {d.id.slice(0, 8)} ·{" "}
                  {d.created
                    ? new Date(d.created * 1000).toLocaleDateString()
                    : ""}
                </small>
              </td>
              <td>
                {d.kind === "csv" ? (
                  <>
                    <b>CSV</b>
                    <small>
                      {d.details.participants} synthetic participants ·{" "}
                      {d.details.observations} rows
                    </small>
                  </>
                ) : (
                  <>
                    <b>NIfTI-1</b>
                    <small>
                      {d.details.shape.join(" × ")} voxels ·{" "}
                      {d.details.orientation.join("")}
                    </small>
                  </>
                )}
              </td>
              <td>
                <span className="tag">
                  {d.details.synthetic || d.name.startsWith("Synthetic")
                    ? "Synthetic demo"
                    : "User supplied"}
                </span>
              </td>
              <td>
                <div className="row-actions">
                  {d.kind === "nifti" && (
                    <button
                      onClick={() => {
                        setSelected(d.id);
                        setIndex(-1);
                        navigate("Brain viewer");
                      }}
                    >
                      View
                    </button>
                  )}
                  <button disabled={busy} onClick={() => act(() => start(d))}>
                    Run analysis <ChevronRight size={14} />
                  </button>
                  {page === "Datasets" && (
                    <button
                      className="danger"
                      onClick={() =>
                        act(async () => {
                          await json(`/datasets/${d.id}`, { method: "DELETE" });
                          if (selected === d.id) setSelected("");
                          await refresh();
                        })
                      }
                    >
                      Delete
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!filtered.length && (
        <div className="empty">
          <Database />
          <h3>
            {query ? "No matching datasets" : "Your research starts with data"}
          </h3>
          <p>Create synthetic samples or upload an authorized research file.</p>
          <button onClick={demo} disabled={busy}>
            Create demo datasets <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );

  if (!signed)
    return (
      <main className="welcome">
        <div className="welcome-art">
          <img src="/mark.svg" alt="NeuroMap mark" />
          <span className="eyebrow">A WORKSPACE FOR DISCOVERY</span>
          <h1>
            A clearer view.
            <br />
            <em>A better question.</em>
          </h1>
          <p>
            Explore brain imaging. Understand model predictions.
            <br />
            Advance reproducible neuroscience.
          </p>
          <div className="welcome-visual">
            <BrainView rotate={false} threshold={0.25} />
          </div>
          <small>
            Original procedural visualization · not anatomical imaging
          </small>
        </div>
        <section className="login">
          <span className="tag">
            <FlaskConical size={13} /> RESEARCH EDITION · 0.1.1
          </span>
          <h2>Welcome to NeuroMap AI</h2>
          <p>
            A private workspace for imaging inspection and reproducible
            experiments.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                setApiOrigin(serverOrigin);
                const r = await json("/auth/login", {
                  method: "POST",
                  body: JSON.stringify({ password }),
                });
                setToken(r.access_token);
                setSigned(true);
                setPassword("");
              });
            }}
          >
            <details className="server-connection">
              <summary>Server connection</summary>
              <label htmlFor="api-server">API server address</label>
              <input
                id="api-server"
                type="url"
                value={serverOrigin}
                placeholder="https://your-research-server.example"
                onChange={(e) => setServerOrigin(e.target.value)}
                autoComplete="url"
              />
              <small>
                Mobile clients require your own HTTPS backend. Leave blank for
                this website’s server. The server must allow your app’s origin.
              </small>
            </details>
            <label htmlFor="password">Workspace password</label>
            <input
              id="password"
              type="password"
              value={password}
              autoComplete="current-password"
              required
              minLength={12}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="primary" disabled={busy}>
              {busy ? "Connecting…" : "Open workspace"}
              <ArrowRight size={17} />
            </button>
          </form>
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          <div className="research-note">
            <ShieldCheck size={22} />
            <p>
              <strong>Built for research. Grounded in transparency.</strong>
              <br />
              Synthetic model outputs are educational demonstrations. This
              software does not diagnose disease or estimate clinical risk.
            </p>
          </div>
          <small>
            Set your workspace password using NEUROMAP_PASSWORD on the API
            server. Sessions remain in browser memory.
          </small>
        </section>
      </main>
    );

  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        Skip to content
      </a>
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("Overview");
          }}
        >
          <img src="/mark.svg" alt="" />
          <span>
            NeuroMap <b>AI</b>
            <small>RESEARCH WORKSPACE</small>
          </span>
        </a>
        <div className="workspace">
          <span className="workspace-avatar">N</span>
          <div>
            Personal workspace<small>Local research environment</small>
          </div>
          <ShieldCheck size={15} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {pages.map((p) => (
            <button
              key={p.name}
              className={page === p.name ? "active" : ""}
              aria-current={page === p.name ? "page" : undefined}
              onClick={() => navigate(p.name)}
            >
              <p.icon size={18} />
              {p.name}
              {p.name === "Datasets" && (
                <span className="count">{datasets.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="scope-note">
            <FlaskConical size={18} />
            <strong>Research, responsibly.</strong>
            <p>
              Every result has a provenance.
              <br />
              Every model has a limitation.
            </p>
            <button onClick={() => navigate("Research library")}>
              Read our methodology <ArrowRight size={13} />
            </button>
          </div>
          <button
            onClick={() =>
              act(async () => {
                await api("/auth/logout", { method: "POST" });
                setToken("");
                setSigned(false);
                setDatasets([]);
                setJobs([]);
              })
            }
          >
            <LogOut size={16} /> Sign out
          </button>
          <small>
            NEUROMAP AI <span>v0.1.1</span>
          </small>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="Toggle navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={20} />
            </button>
            <span className="muted">Workspace</span>
            <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>
          <div>
            <span className="environment">
              <i /> Private workspace
            </span>
            <button
              className="icon-button"
              aria-label="Toggle color theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="icon-button"
              aria-label="Help and limitations"
              onClick={() => navigate("Research library")}
            >
              <CircleHelp size={18} />
            </button>
            <span className="avatar">NR</span>
          </div>
        </header>
        <main id="main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === "Overview"
                  ? "YOUR RESEARCH, IN FOCUS"
                  : "NEUROMAP WORKSPACE"}
              </div>
              <h1>{page === "Overview" ? "Research overview" : page}</h1>
              <p>
                {page === "Overview"
                  ? "From imaging data to reproducible insight."
                  : page === "Brain viewer"
                    ? "Inspect spatial geometry and intensity. Keep interpretation in context."
                    : page === "Model evaluation"
                      ? "Transparent metrics, measured on a held-out participant split."
                      : "Explore, organize, and document your research."}
              </p>
            </div>
            <div className="heading-actions">
              <button onClick={demo} disabled={busy}>
                <FlaskConical size={16} />
                Create demo
              </button>
              <button className="primary" onClick={() => setUploading(true)}>
                <Plus size={17} />
                New dataset
              </button>
            </div>
          </div>
          <div className="safety-strip">
            <FlaskConical size={15} />
            <span>
              <strong>Research use only.</strong> Demo datasets and model
              metrics are synthetic. No clinical predictions.
            </span>
            <button onClick={() => navigate("Research library")}>
              View limitations <ArrowRight size={13} />
            </button>
          </div>
          {error && (
            <div role="alert" className="error">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="notice">
              <Check size={16} />
              {notice}
            </div>
          )}

          {page === "Overview" && (
            <>
              <div className="stats-grid">
                {[
                  {
                    label: "Datasets in workspace",
                    value: datasets.length,
                    sub: `${datasets.filter((d) => d.kind === "nifti").length} image volumes · ${datasets.filter((d) => d.kind === "csv").length} feature tables`,
                    icon: Database,
                  },
                  {
                    label: "Completed analyses",
                    value: jobs.filter((j) => j.status === "completed").length,
                    sub: "Persisted, reproducible runs",
                    icon: FlaskConical,
                  },
                  {
                    label: "Active jobs",
                    value: jobs.filter((j) =>
                      ["queued", "running"].includes(j.status),
                    ).length,
                    sub: "Single CPU worker · bounded queue",
                    icon: Activity,
                  },
                  {
                    label: "Clinical models",
                    value: 0,
                    sub: "Validation and licensed data required",
                    icon: ShieldCheck,
                  },
                ].map((s) => (
                  <section className="stat" key={s.label}>
                    <div>
                      {s.label}
                      <s.icon size={17} />
                    </div>
                    <strong>{s.value.toString().padStart(2, "0")}</strong>
                    <small>{s.sub}</small>
                  </section>
                ))}
              </div>
              <div className="overview-grid">
                <section className="panel brain-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">SPATIAL EXPLORER</span>
                      <h2>Look beyond the surface.</h2>
                      <p>A new perspective on your imaging data.</p>
                    </div>
                    <span className="tag">3D VIEW</span>
                  </div>
                  <BrainView
                    cloud={volume?.preview}
                    rotate={false}
                    threshold={0.25}
                  />
                  <div className="brain-overlay">
                    <span className="dot" />
                    {volume
                      ? "Uploaded voxel intensities · thresholded preview"
                      : "Procedural synthetic form · not an anatomical atlas"}
                  </div>
                  <div className="panel-footer">
                    <span>Orbit, zoom, and inspect image slices</span>
                    <button onClick={() => navigate("Brain viewer")}>
                      Open brain viewer <ArrowRight size={15} />
                    </button>
                  </div>
                </section>
                <section className="panel analysis-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="eyebrow">REPRODUCIBLE BY DESIGN</span>
                      <h2>One question. A traceable run.</h2>
                    </div>
                    <Boxes size={21} />
                  </div>
                  <p className="body-copy">
                    A transparent baseline gives you a place to start, and a
                    result you can inspect.
                  </p>
                  <ol className="steps">
                    <li>
                      <span>01</span>
                      <div>
                        <strong>Bring your data</strong>
                        <p>
                          Validated NIfTI volumes or synthetic feature tables.
                        </p>
                      </div>
                    </li>
                    <li>
                      <span>02</span>
                      <div>
                        <strong>Run a bounded workflow</strong>
                        <p>
                          Inspect image metadata or fit a synthetic baseline.
                        </p>
                      </div>
                    </li>
                    <li>
                      <span>03</span>
                      <div>
                        <strong>Understand the evidence</strong>
                        <p>
                          Held-out metrics, provenance, and downloadable
                          reports.
                        </p>
                      </div>
                    </li>
                  </ol>
                  <button className="wide" onClick={() => navigate("Datasets")}>
                    Explore datasets <ArrowRight size={16} />
                  </button>
                </section>
              </div>
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>Your datasets</h2>
                    <p>A clear starting point for every analysis.</p>
                  </div>
                  <button onClick={() => navigate("Datasets")}>
                    View all datasets <ArrowRight size={14} />
                  </button>
                </div>
                {datasetTable}
              </section>
            </>
          )}

          {page === "Datasets" && (
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Dataset explorer</h2>
                  <p>
                    Maximum 100 datasets · 16 MiB per upload · private server
                    storage
                  </p>
                </div>
                <label className="search">
                  <Search size={16} />
                  <input
                    aria-label="Search datasets"
                    placeholder="Search datasets…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
              </div>
              {datasetTable}
              <div className="panel-footer">
                <span>
                  Use generated fixtures to explore the complete workflow.
                </span>
                <button
                  onClick={() =>
                    act(() => download("/sample/csv", "synthetic.csv"))
                  }
                >
                  <ArrowDownToLine size={15} />
                  Sample CSV
                </button>
                <button
                  onClick={() =>
                    act(() => download("/sample/nifti", "synthetic.nii"))
                  }
                >
                  <ArrowDownToLine size={15} />
                  Sample NIfTI
                </button>
              </div>
            </section>
          )}

          {page === "Brain viewer" && (
            <>
              <div className="viewer-toolbar">
                <label>
                  Image volume
                  <select
                    value={selected}
                    onChange={(e) => {
                      setSelected(e.target.value);
                      setIndex(-1);
                    }}
                  >
                    <option value="">Procedural demonstration</option>
                    {datasets
                      .filter((d) => d.kind === "nifti")
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={rotate}
                    onChange={(e) => setRotate(e.target.checked)}
                  />{" "}
                  Auto rotate
                </label>
                <label>
                  Intensity threshold {threshold.toFixed(2)}
                  <input
                    aria-label="Intensity threshold"
                    type="range"
                    min="0"
                    max="1"
                    step=".05"
                    value={threshold}
                    onChange={(e) => setThreshold(+e.target.value)}
                  />
                </label>
              </div>
              <div className="viewer-grid">
                <section className="panel large-brain">
                  <BrainView
                    cloud={volume?.preview}
                    rotate={rotate}
                    threshold={threshold}
                  />
                  <div className="panel-footer">
                    {volume
                      ? "Affine-positioned voxel cloud; spatial unit: " +
                        volume.details.spatial_unit
                      : "Original synthetic form. No parcellation or regional anatomy."}{" "}
                    · Drag to orbit · Scroll to zoom
                  </div>
                </section>
                <section className="panel metadata">
                  <h2>
                    {image ? "Image inspection" : "A perspective, with context"}
                  </h2>
                  {volume ? (
                    <>
                      <Slice data={volume.slice} />
                      <label>
                        Index axis
                        <select
                          value={axis}
                          onChange={(e) => {
                            setAxis(+e.target.value);
                            setIndex(-1);
                          }}
                        >
                          <option value={0}>Axis 0</option>
                          <option value={1}>Axis 1</option>
                          <option value={2}>Axis 2</option>
                        </select>
                      </label>
                      <label>
                        Slice {volume.index}
                        <input
                          type="range"
                          aria-label="Slice index"
                          min={0}
                          max={volume.details.shape[axis] - 1}
                          value={index < 0 ? volume.index : index}
                          onChange={(e) => setIndex(+e.target.value)}
                        />
                      </label>
                      <dl>
                        <dt>Dimensions</dt>
                        <dd>{volume.details.shape.join(" × ")}</dd>
                        <dt>Voxel spacing</dt>
                        <dd>
                          {volume.details.voxel_sizes.join(" × ")}{" "}
                          {volume.details.spatial_unit}
                        </dd>
                        <dt>Axis codes</dt>
                        <dd>{volume.details.orientation.join(" / ")}</dd>
                        <dt>Intensity range</dt>
                        <dd>
                          {volume.details.intensity_min.toFixed(2)} –{" "}
                          {volume.details.intensity_max.toFixed(2)}
                        </dd>
                      </dl>
                      <small>
                        Index slices are not reoriented to clinical display
                        conventions. The point cloud is an intensity preview,
                        not segmentation.
                      </small>
                    </>
                  ) : (
                    <>
                      <p>
                        The default form is generated mathematically. It is not
                        a scientific brain mesh or a patient reconstruction.
                      </p>
                      <p>
                        Choose a NIfTI image to see actual voxel positions,
                        grayscale slices, spatial units and header geometry.
                      </p>
                      <button onClick={demo} disabled={busy}>
                        Create a synthetic image <ArrowRight size={15} />
                      </button>
                    </>
                  )}
                </section>
              </div>
            </>
          )}

          {page === "Model evaluation" &&
            (result ? (
              <>
                <div className="section-heading">
                  <div>
                    <h2>
                      Synthetic binary classification{" "}
                      <span className="tag">COMPUTED DEMO</span>
                    </h2>
                    <p>
                      Logistic regression · fixed threshold {result.threshold} ·
                      seed {result.seed} · selected C={result.selected_C}
                    </p>
                  </div>
                  <button onClick={() => report(latest!.id)}>
                    <ArrowDownToLine size={15} />
                    Export report
                  </button>
                </div>
                <div className="stats-grid">
                  {[
                    ["ROC-AUC", result.metrics.roc_auc],
                    ["PR-AUC", result.metrics.pr_auc],
                    ["Balanced accuracy", result.metrics.balanced_accuracy],
                    ["Brier score", result.metrics.brier],
                  ].map(([name, value]) => (
                    <section className="stat" key={name}>
                      <div>{name}</div>
                      <strong>{(value as number).toFixed(3)}</strong>
                      <small>
                        {name === "ROC-AUC"
                          ? `95% CI ${result.roc_auc_ci95.map((x: number) => x.toFixed(3)).join(" – ")}`
                          : name === "Brier score"
                            ? "Lower is better · uncalibrated probabilities"
                            : "Held-out synthetic observations"}
                      </small>
                    </section>
                  ))}
                </div>
                <div className="evaluation-grid">
                  <section className="panel chart">
                    <h2>Receiver operating characteristic</h2>
                    <p>True positive rate vs false positive rate</p>
                    <div
                      className="chart-area"
                      role="img"
                      aria-label={`ROC curve; area ${result.metrics.roc_auc.toFixed(3)}, dummy baseline ${result.baseline.roc_auc.toFixed(3)}`}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={result.roc}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--border)"
                          />
                          <XAxis
                            dataKey="fpr"
                            type="number"
                            domain={[0, 1]}
                            tick={{ fill: "var(--muted)" }}
                          />
                          <YAxis
                            domain={[0, 1]}
                            tick={{ fill: "var(--muted)" }}
                          />
                          <Tooltip />
                          <Legend />
                          <ReferenceLine
                            segment={[
                              { x: 0, y: 0 },
                              { x: 1, y: 1 },
                            ]}
                            stroke="#94a3b8"
                            strokeDasharray="5 5"
                          />
                          <Line
                            type="stepAfter"
                            name="Logistic regression"
                            dataKey="tpr"
                            stroke="#71dcc7"
                            dot={false}
                            strokeWidth={3}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                  <section className="panel chart">
                    <h2>Probability reliability</h2>
                    <p>
                      Observed fraction of class 1 vs mean predicted probability
                    </p>
                    <div
                      className="chart-area"
                      role="img"
                      aria-label="Calibration plot on five equally spaced probability bins; diagonal represents perfect calibration"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={result.calibration}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--border)"
                          />
                          <XAxis
                            dataKey="predicted"
                            type="number"
                            domain={[0, 1]}
                            tick={{ fill: "var(--muted)" }}
                          />
                          <YAxis
                            domain={[0, 1]}
                            tick={{ fill: "var(--muted)" }}
                          />
                          <Tooltip />
                          <Legend />
                          <ReferenceLine
                            segment={[
                              { x: 0, y: 0 },
                              { x: 1, y: 1 },
                            ]}
                            stroke="#94a3b8"
                            strokeDasharray="5 5"
                          />
                          <Line
                            name="Observed fraction"
                            dataKey="observed"
                            stroke="#aa9bff"
                            strokeWidth={3}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                </div>
                <div className="evaluation-grid">
                  <section className="panel metadata">
                    <h2>Baseline comparison</h2>
                    <dl>
                      {[
                        "roc_auc",
                        "pr_auc",
                        "balanced_accuracy",
                        "f1",
                        "sensitivity",
                        "specificity",
                        "brier",
                        "prevalence",
                      ].map((m) => (
                        <div key={m}>
                          <dt>{m.replaceAll("_", " ")}</dt>
                          <dd>
                            {result.metrics[m]?.toFixed(3)}{" "}
                            <small>
                              {" "}
                              / dummy {result.baseline[m]?.toFixed(3)}
                            </small>
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <h3>Confusion matrix</h3>
                    <p>Rows: true class 0/1 · columns: predicted class 0/1</p>
                    <div className="matrix">
                      {result.metrics.confusion_matrix
                        .flat()
                        .map((n: number, i: number) => (
                          <span key={i}>{n}</span>
                        ))}
                    </div>
                    <p>
                      Test prevalence: {percent(result.metrics.prevalence)}.
                      Class-specific metrics and site breakdown are in the
                      exported report.
                    </p>
                  </section>
                  <section className="panel metadata">
                    <h2>Explainability & uncertainty</h2>
                    <p>
                      Standardized logistic coefficients describe the fitted
                      synthetic decision function.
                    </p>
                    {Object.entries(result.coefficients).map(([name, v]) => (
                      <div className="coefficient" key={name}>
                        <span>{name}</span>
                        <div>
                          <i
                            style={{
                              width: `${Math.min(100, Math.abs(v as number) * 35)}%`,
                            }}
                          />
                        </div>
                        <b>{(v as number).toFixed(3)}</b>
                      </div>
                    ))}
                    <p>
                      Coefficients are associations, not causal effects or
                      anatomical explanations.
                    </p>
                    <h3>Participant-safe splits</h3>
                    <dl>
                      {Object.entries(result.splits).map(
                        ([name, v]: [string, any]) => (
                          <div key={name}>
                            <dt>{name}</dt>
                            <dd>
                              {v.participants} participants · {v.observations}{" "}
                              rows
                            </dd>
                          </div>
                        ),
                      )}
                    </dl>
                    <small>
                      95% ROC-AUC interval uses 200 participant-cluster
                      bootstrap resamples. It measures sampling variation on
                      this synthetic test set; it does not establish clinical
                      validity or external generalization.
                    </small>
                  </section>
                </div>
              </>
            ) : (
              <section className="panel empty">
                <Activity />
                <h2>No computed model results yet</h2>
                <p>
                  Create a synthetic feature table, then run analysis from
                  Datasets.
                </p>
                <button onClick={() => navigate("Datasets")}>
                  Go to datasets <ArrowRight size={16} />
                </button>
              </section>
            ))}

          {page === "Experiments" && (
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Experiment history</h2>
                  <p>
                    Persisted job state and artifact provenance. No automatic
                    retraining.
                  </p>
                </div>
                <button onClick={() => act(refresh)}>Refresh</button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Run / dataset</th>
                      <th>Status</th>
                      <th>Workflow</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((j) => (
                      <tr key={j.id}>
                        <td>
                          <strong>
                            {datasets.find((d) => d.id === j.dataset_id)
                              ?.name || j.dataset_id}
                          </strong>
                          <small>
                            {j.id.slice(0, 8)} ·{" "}
                            {new Date(j.created * 1000).toLocaleString()}
                          </small>
                        </td>
                        <td>
                          <span className={`tag status-${j.status}`}>
                            {j.status}
                          </span>
                        </td>
                        <td>
                          {j.result.task || "Pending workflow"}
                          {j.result.error && (
                            <small className="danger">{j.result.error}</small>
                          )}
                        </td>
                        <td>
                          <div className="row-actions">
                            {j.status === "completed" && (
                              <>
                                <button onClick={() => report(j.id)}>
                                  Report <ArrowDownToLine size={14} />
                                </button>
                                {j.result.metrics && (
                                  <button
                                    onClick={() => {
                                      setSelectedJob(j.id);
                                      navigate("Model evaluation");
                                    }}
                                  >
                                    Evaluate <ArrowRight size={14} />
                                  </button>
                                )}
                              </>
                            )}
                            {j.status === "queued" && (
                              <button
                                onClick={() =>
                                  act(async () => {
                                    await json(`/jobs/${j.id}/cancel`, {
                                      method: "POST",
                                    });
                                    await refresh();
                                  })
                                }
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!jobs.length && (
                  <div className="empty">
                    <History />
                    <h3>No runs yet</h3>
                    <p>
                      Start an analysis from a dataset to create a traceable
                      run.
                    </p>
                    <button onClick={() => navigate("Datasets")}>
                      Choose a dataset
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {page === "Research library" && (
            <div className="research-grid">
              <section className="panel metadata">
                <span className="eyebrow">EVIDENCE BEFORE INFERENCE</span>
                <h2>A deliberately bounded foundation.</h2>
                <p>
                  Research reviewed through 27 October 2026. This is a targeted
                  review, not an exhaustive systematic review. The repository
                  includes a literature matrix, dataset catalog, methodology and
                  model card.
                </p>
                <h3>What this release supports</h3>
                <p>
                  NIfTI-1 geometry inspection, thresholded voxel visualization,
                  synthetic feature classification, participant-level
                  partitions, baseline comparisons, confidence intervals and
                  exportable provenance.
                </p>
                <h3>What requires further evidence</h3>
                <p>
                  Disease prediction, registration, segmentation, parcellation,
                  connectivity, external validation and foundation-model
                  adaptation. No clinical model or risk score is enabled.
                </p>
                <h3>Data access matters</h3>
                <p>
                  ADNI and PPMI require approved access and agreements. UK
                  Biobank requires institutional access and currently reports an
                  application pause. Check each OpenNeuro dataset’s terms before
                  reuse. No restricted dataset is bundled.
                </p>
                <h3>Reporting is part of reproducibility</h3>
                <p>
                  Record participant partitions, acquisition sites,
                  preprocessing, label provenance, failed cases and uncertainty.
                  Saliency and attribution cannot prove causality or clinical
                  validity.
                </p>
              </section>
              <section className="panel metadata">
                <h2>Primary references & standards</h2>
                {[
                  [
                    "BIDS standards",
                    "https://bids.neuroimaging.io/standards/index.html",
                    "Organization and metadata interoperability",
                  ],
                  [
                    "TRIPOD+AI · 2024",
                    "https://doi.org/10.1136/bmj-2023-078378",
                    "Transparent reporting of prediction models",
                  ],
                  [
                    "CLAIM update · 2024",
                    "https://doi.org/10.1148/ryai.240300",
                    "Medical-imaging AI reporting checklist",
                  ],
                  [
                    "Wen et al. · 2020",
                    "https://doi.org/10.1016/j.media.2020.101694",
                    "Reproducible evaluation and data leakage",
                  ],
                  [
                    "IMDRF GMLP · 2025",
                    "https://www.imdrf.org/documents/good-machine-learning-practice-medical-device-development-guiding-principles",
                    "Lifecycle and independent evaluation",
                  ],
                  [
                    "BrainIAC · 2026",
                    "https://doi.org/10.1038/s41593-026-02202-6",
                    "Experimental brain MRI foundation model",
                  ],
                ].map(([name, url, description]) => (
                  <a
                    className="reference"
                    href={url}
                    key={name}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <BookOpen size={18} />
                    <div>
                      <strong>{name}</strong>
                      <small>{description}</small>
                    </div>
                    <ArrowRight size={15} />
                  </a>
                ))}
                <p>
                  Source documentation and access restrictions are recorded in
                  the repository, with links to official resources.
                </p>
              </section>
            </div>
          )}

          {page === "Settings" && (
            <div className="research-grid">
              <section className="panel metadata">
                <h2>Workspace preferences</h2>
                <label>
                  Color theme
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                  >
                    <option value="dark">Dark · deep navy</option>
                    <option value="light">Light · paper</option>
                  </select>
                </label>
                <h3>Storage & retention</h3>
                <p>
                  Dataset files and analysis records remain on the configured
                  API server until deleted. Delete a dataset from Datasets to
                  remove its stored payload and associated reports. Minimal
                  audit records remain.
                </p>
                <h3>Single-user access</h3>
                <p>
                  This release has one workspace-owner role. It does not provide
                  separate user accounts or tenant isolation. Sessions expire
                  after eight hours and are invalidated when the API restarts.
                </p>
              </section>
              <section className="panel metadata">
                <ShieldCheck size={26} />
                <h2>Privacy by scope</h2>
                <p>
                  Only upload data you are authorized to process. Remove
                  identifying headers, faces and participant information before
                  uploading. NIfTI parsing does not constitute
                  de-identification.
                </p>
                <p>
                  Uploaded image text headers are discarded. Only allowlisted
                  geometry, intensity statistics, the source checksum and your
                  filename are stored. Use neutral filenames.
                </p>
                <p>
                  All model training is explicit. Uploading an image never
                  trains a disease model. Reports contain synthetic IDs and
                  split membership; store them responsibly.
                </p>
                <p>
                  Keep this workspace private. Use TLS, disk access controls and
                  a reviewed deployment configuration before any institutional
                  use.
                </p>
              </section>
            </div>
          )}
          <footer className="page-footer">
            <span>
              <img src="/mark.svg" alt="" /> NeuroMap AI{" "}
              <span className="muted">/</span> Built for questions worth asking.
            </span>
            <button onClick={() => navigate("Research library")}>
              Methodology & limitations <ArrowRight size={13} />
            </button>
          </footer>
        </main>
      </div>

      {uploading && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-title"
          >
            <button
              className="modal-close icon-button"
              aria-label="Close upload"
              onClick={() => setUploading(false)}
            >
              <X size={20} />
            </button>
            <span className="eyebrow">A TRACEABLE START</span>
            <h2 id="upload-title">Add a research dataset</h2>
            <p>
              NIfTI-1 (.nii, .nii.gz) or synthetic feature CSV. Maximum 16 MiB;
              64 MiB decompressed image payload.
            </p>
            <label className="check">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              I have authorization to process this file, have removed
              identifying data, and understand CSV training is for synthetic
              data only.
            </label>
            <label
              className={`upload-zone ${!consent || busy ? "disabled" : ""}`}
            >
              <Upload size={28} />
              <strong>
                {busy ? "Validating file…" : "Choose a file to validate"}
              </strong>
              <small>
                3D images up to 4 million voxels; no archives or DICOM
              </small>
              <input
                autoFocus
                type="file"
                accept=".nii,.nii.gz,.csv"
                aria-label="Choose research dataset"
                disabled={!consent || busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  act(async () => {
                    const form = new FormData();
                    form.append("file", f);
                    await json("/datasets", {
                      method: "POST",
                      headers: { "X-Data-Consent": "authorized-research" },
                      body: form,
                    });
                    await refresh();
                    setUploading(false);
                    navigate("Datasets");
                    setNotice("Dataset validated and stored.");
                  });
                }}
              />
            </label>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            <small>
              CSV schema: participant_id, site, feature_a, feature_b, feature_c,
              label. Use the sample CSV as your format reference.
            </small>
            <button
              onClick={() =>
                act(() => download("/sample/csv", "synthetic.csv"))
              }
            >
              Download sample CSV <ArrowDownToLine size={14} />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
