/**
 * LogPanel —— 右下角固定日志面板
 *
 * 设计：替代原本的临时错误 toast，固定在右下角。
 * - 默认展开 30% 显示最新日志/错误
 * - 折叠后只显示状态徽章，节省画布空间
 * - 三类消息：info / warn / error
 */

import { useState, useRef, useEffect } from "react";
import type { GpuError } from "@shaderpad/runtime";

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
}

interface Props {
  status: "idle" | "compiling" | "ok" | "error";
  errors: GpuError[];
  logs: LogEntry[];
  onClear: () => void;
}

const STATUS_TEXT: Record<string, string> = {
  idle: "Ready",
  compiling: "Compiling…",
  ok: "Running",
  error: "Error",
};

const STATUS_CLS: Record<string, string> = {
  idle: "",
  compiling: "compiling",
  ok: "ok",
  error: "error",
};

export function LogPanel({ status, errors, logs, onClear }: Props) {
  const [expanded, setExpanded] = useState(false);

  // 有错误时自动展开
  useEffect(() => {
    if (status === "error" || errors.length > 0) {
      setExpanded(true);
    }
  }, [status, errors.length]);

  const totalCount = errors.length + logs.length;

  return (
    <div
      className={`log-panel ${expanded ? "expanded" : "collapsed"}`}
      role="region"
      aria-label="Log panel"
    >
      <div className="log-header" onClick={() => setExpanded((e) => !e)}>
        <span className={`status-badge ${STATUS_CLS[status]}`}>
          ● {STATUS_TEXT[status]}
        </span>
        <span className="log-count">
          {totalCount > 0 && (
            <>
              {errors.length > 0 && (
                <span className="count-error">{errors.length} err</span>
              )}
              {logs.length > 0 && (
                <span className="count-log">{logs.length} log</span>
              )}
            </>
          )}
        </span>
        <span className="log-toggle">{expanded ? "▾" : "▴"}</span>
      </div>

      {expanded && (
        <div className="log-body">
          {errors.length > 0 && (
            <div className="log-section log-section-errors">
              <div className="log-section-title">Errors</div>
              {errors.map((e, i) => (
                <div key={i} className="log-item error">
                  <span className="log-loc">
                    L{e.line}:{e.column}
                  </span>
                  <span className="log-msg">{e.message}</span>
                </div>
              ))}
            </div>
          )}

          {logs.length > 0 && (
            <div className="log-section log-section-logs">
              <div className="log-section-title">Console</div>
              <LogList logs={logs} />
            </div>
          )}

          {totalCount === 0 && <div className="log-empty">No logs yet</div>}

          <div className="log-footer">
            <button
              onClick={(ev) => {
                ev.stopPropagation();
                onClear();
              }}
              title="Clear logs"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LogList({ logs }: { logs: LogEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight;
    }
  }, [logs.length]);

  return (
    <div className="log-list" ref={ref}>
      {logs.map((entry, i) => (
        <div key={i} className={`log-item ${entry.level}`}>
          <span className="log-time">
            {new Date(entry.timestamp).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </span>
          <span className="log-level">{entry.level.toUpperCase()}</span>
          <span className="log-msg">{entry.message}</span>
        </div>
      ))}
    </div>
  );
}
