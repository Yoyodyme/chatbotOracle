import React, { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";
import { updateSprint } from "../../api/sprints";
import { deriveSprintStatus } from "../../hooks/useSprints";
import Skeleton from "../shared/Skeleton";
import { StatusBadge, PriorityBadge } from "../tasks/TaskBadge";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusPill({ status }) {
  const CONFIG = {
    ACTIVO: {
      bg: "var(--accent-soft)",
      border: "rgba(6,111,204,0.25)",
      color: "var(--accent)",
      dot: "var(--accent)",
    },
    FUTURO: {
      bg: "#f1efe8",
      border: "rgba(141,141,141,0.3)",
      color: "#5f5e5a",
      dot: "#888780",
    },
    PASADO: {
      bg: "#f5c4b3",
      border: "rgba(153,60,29,0.35)",
      color: "#712b13",
      dot: "#993c1d",
    },
  };
  const cfg = CONFIG[status] ?? CONFIG.PASADO;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 9px",
        borderRadius: 10,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function SkeletonTaskRows() {
  return (
    <>
      {[...Array(4)].map((_, i) => (
        <tr key={i}>
          <td style={{ padding: "9px 12px" }}>
            <Skeleton width="72px" height="12px" />
          </td>
          <td style={{ padding: "9px 12px" }}>
            <Skeleton width="180px" height="12px" />
          </td>
          <td style={{ padding: "9px 12px" }}>
            <Skeleton width="80px" height="12px" />
          </td>
          <td style={{ padding: "9px 12px" }}>
            <Skeleton width="60px" height="12px" />
          </td>
        </tr>
      ))}
    </>
  );
}

const STATUS_OPTIONS = ["ACTIVO", "FUTURO", "PASADO"];

const STATUS_CFG = {
  ACTIVO: { bg: "var(--accent-soft)", border: "rgba(6,111,204,0.25)", color: "var(--accent)", dot: "var(--accent)" },
  FUTURO: { bg: "#f1efe8", border: "rgba(141,141,141,0.3)", color: "#5f5e5a", dot: "#888780" },
  PASADO: { bg: "#f5c4b3", border: "rgba(153,60,29,0.35)", color: "#712b13", dot: "#993c1d" },
};

const LABEL_STYLE = {
  fontSize: "0.75rem",
  fontWeight: 600,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: "5px",
  display: "block",
};

const VALUE_STYLE = {
  fontSize: "13px",
  fontWeight: 500,
  color: "var(--text-primary)",
};

const SECTION_TITLE_STYLE = {
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: "12px",
};

const TH_STYLE = {
  padding: "7px 12px",
  textAlign: "left",
  fontSize: 11,
  fontWeight: 600,
  color: "var(--text-muted)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  borderBottom: "1px solid var(--border)",
  background: "#f7f8f9",
};

const TD_STYLE = {
  padding: "8px 12px",
  fontSize: 12,
  color: "var(--text-primary)",
  borderBottom: "1px solid var(--border)",
  verticalAlign: "middle",
};

const TD_MONO_STYLE = {
  padding: "8px 12px",
  fontSize: 11,
  fontFamily: "var(--font-mono)",
  color: "var(--text-muted)",
  borderBottom: "1px solid var(--border)",
  verticalAlign: "middle",
};

export default function SprintDetailPanel({ sprint, onClose, onStatusChange }) {
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localEstado, setLocalEstado] = useState(
    sprint.estado ?? deriveSprintStatus(sprint),
  );
  const [showPicker, setShowPicker] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);

  const status = localEstado;

  async function handlePickStatus(newEstado) {
    if (newEstado === localEstado || savingStatus) return;
    setSavingStatus(true);
    try {
      await updateSprint(sprint.idSprint, { ...sprint, estado: newEstado });
      setLocalEstado(newEstado);
      onStatusChange?.(newEstado);
    } finally {
      setSavingStatus(false);
      setShowPicker(false);
    }
  }

  useEffect(() => {
    if (!sprint?.idSprint) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiFetch(`/api/tareas/sprint/${sprint.idSprint}`)
      .then((data) => {
        if (!cancelled) setTareas(data ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sprint.idSprint]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        if (showPicker) { setShowPicker(false); }
        else { onClose(); }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, showPicker]);

  const total = tareas.length;
  const done = tareas.filter((t) => {
    const name = (t.estatus?.nombre ?? "").toLowerCase().trim();
    return name === "completed" || name === "completada" || name === "done";
  }).length;
  const outstanding = tareas.filter((t) => {
    const name = (t.estatus?.nombre ?? "").toLowerCase().trim();
    return (
      name === "in progress" ||
      name === "en progreso" ||
      name === "pending" ||
      name === "pendiente" ||
      name === "not started"
    );
  }).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const overlayStyle = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 9000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    overflowY: "auto",
  };

  const cardStyle = {
    width: "100%",
    maxWidth: "680px",
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-md)",
    animation: "scaleIn 150ms ease-out both",
    display: "flex",
    flexDirection: "column",
    maxHeight: "calc(100vh - 32px)",
    overflow: "hidden",
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "18px 22px 16px",
    borderBottom: "1px solid var(--border)",
    flexShrink: 0,
  };

  const closeBtnStyle = {
    width: 30,
    height: 30,
    borderRadius: "var(--radius-md)",
    fontSize: "18px",
    color: "var(--text-muted)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "color 100ms, background-color 100ms",
    marginLeft: "auto",
  };

  const bodyStyle = {
    padding: "20px 22px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    flex: 1,
  };

  const footerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "14px 22px",
    borderTop: "1px solid var(--border)",
    flexShrink: 0,
    backgroundColor: "var(--bg-surface)",
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div style={headerStyle}>
          <span
            style={{
              flex: 1,
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "1.0625rem",
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {sprint.nombre}
          </span>
          <button
            style={closeBtnStyle}
            onClick={onClose}
            aria-label="Close detail panel"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-primary)";
              e.currentTarget.style.backgroundColor = "var(--bg-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          {/* Metadata grid — Status + Dates */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <div>
              <span style={LABEL_STYLE}>Status</span>
              <div style={{ ...VALUE_STYLE, position: "relative" }}>
                <button
                  onClick={() => setShowPicker((v) => !v)}
                  disabled={savingStatus}
                  style={{
                    all: "unset",
                    cursor: savingStatus ? "not-allowed" : "pointer",
                    opacity: savingStatus ? 0.6 : 1,
                  }}
                  title="Change status"
                >
                  <StatusPill status={status} />
                </button>
                {showPicker && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      zIndex: 100,
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      boxShadow: "var(--shadow-md)",
                      padding: "6px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      minWidth: 120,
                    }}
                  >
                    {STATUS_OPTIONS.map((opt) => {
                      const cfg = STATUS_CFG[opt];
                      const isActive = opt === localEstado;
                      return (
                        <button
                          key={opt}
                          onClick={() => handlePickStatus(opt)}
                          style={{
                            all: "unset",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "4px 9px",
                            borderRadius: 8,
                            background: isActive ? cfg.bg : "transparent",
                            border: isActive ? `1px solid ${cfg.border}` : "1px solid transparent",
                            color: isActive ? cfg.color : "var(--text-secondary)",
                            cursor: "pointer",
                            transition: "background 80ms",
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) e.currentTarget.style.background = "var(--bg-hover)";
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: cfg.dot,
                              flexShrink: 0,
                            }}
                          />
                          {opt.charAt(0) + opt.slice(1).toLowerCase()}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div>
              <span style={LABEL_STYLE}>Dates</span>
              <div style={{ ...VALUE_STYLE, fontSize: 12, fontWeight: 400 }}>
                {formatDate(sprint.fechaInicio)} → {formatDate(sprint.fechaFin)}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
            }}
          >
            {[
              { label: "Total tasks", value: loading ? "—" : total },
              { label: "Done", value: loading ? "—" : done },
              { label: "Outstanding", value: loading ? "—" : outstanding },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  background: "#f7f8f9",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 14px",
                }}
              >
                <span style={LABEL_STYLE}>{label}</span>
                <div style={{ ...VALUE_STYLE, fontSize: "1.125rem" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "var(--text-secondary)",
                marginBottom: 5,
              }}
            >
              <span>Progress</span>
              <span>{loading ? "—" : `${pct}%`}</span>
            </div>
            <div
              style={{
                height: 6,
                background: "var(--bg-hover)",
                borderRadius: 9999,
                overflow: "hidden",
              }}
            >
              {!loading && (
                <div
                  style={{
                    height: "100%",
                    borderRadius: 9999,
                    background: "var(--accent)",
                    width: `${pct}%`,
                    transition: "width 600ms ease",
                  }}
                />
              )}
            </div>
          </div>

          {/* Tasks section */}
          <div>
            <p style={SECTION_TITLE_STYLE}>Tasks</p>

            {error && (
              <p style={{ fontSize: 12, color: "var(--danger)", padding: "8px 0" }}>
                Could not load tasks. Verify the endpoint exists on the backend.
              </p>
            )}

            {!error && (
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    tableLayout: "fixed",
                  }}
                >
                  <colgroup>
                    <col style={{ width: "72px" }} />
                    <col />
                    <col style={{ width: "110px" }} />
                    <col style={{ width: "90px" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={TH_STYLE}>ID</th>
                      <th style={TH_STYLE}>Title</th>
                      <th style={TH_STYLE}>Status</th>
                      <th style={TH_STYLE}>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <SkeletonTaskRows />
                    ) : tareas.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          style={{
                            ...TD_STYLE,
                            textAlign: "center",
                            color: "var(--text-muted)",
                            padding: "20px 12px",
                            borderBottom: "none",
                          }}
                        >
                          No tasks associated with this sprint yet.
                        </td>
                      </tr>
                    ) : (
                      tareas.map((t) => (
                        <tr
                          key={t.idTarea}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                          }}
                          style={{ transition: "background-color 100ms" }}
                        >
                          <td style={TD_MONO_STYLE}>YD-{t.idTarea}</td>
                          <td style={TD_STYLE}>
                            <span
                              style={{
                                display: "block",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={t.titulo}
                            >
                              {t.titulo}
                            </span>
                          </td>
                          <td style={TD_STYLE}>
                            <StatusBadge estatus={t.estatus} />
                          </td>
                          <td style={TD_STYLE}>
                            <PriorityBadge prioridad={t.prioridad} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <button
            style={{
              padding: "9px 20px",
              borderRadius: "var(--radius-md)",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#fff",
              background: "var(--accent)",
              border: "none",
              cursor: "pointer",
              transition: "opacity 100ms",
            }}
            onClick={onClose}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
