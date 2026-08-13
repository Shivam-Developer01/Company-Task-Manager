import { useState, useEffect } from "react";
import aiService from "../../services/aiService";
import "./AiRecommendationCard.css";

/**
 * AI Task Assignment Recommendation Card Component (Phase 15.4).
 * Provides an explicit trigger for AI task-assignment recommendations,
 * displays authoritative deterministic candidate evidence alongside AI rationale,
 * and allows human decision-makers to pre-select recommendations in existing forms.
 */
function AiRecommendationCard({
  taskId,
  onSelectEmployee,
  buttonLabel = "✨ Get AI Assignment Recommendation",
}) {
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [recommendationPayload, setRecommendationPayload] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTaskId, setActiveTaskId] = useState(taskId);

  // Prevent Stale UI State: Reset recommendation state if target task changes
  useEffect(() => {
    if (taskId !== activeTaskId) {
      setActiveTaskId(taskId);
      setStatus("idle");
      setRecommendationPayload(null);
      setErrorMsg("");
    }
  }, [taskId, activeTaskId]);

  if (!taskId) return null;

  const fetchRecommendation = async () => {
    if (status === "loading") return;

    try {
      setStatus("loading");
      setErrorMsg("");

      const result = await aiService.generateRecommendation({
        recommendationType: "TASK_ASSIGNMENT",
        targetType: "task",
        targetId: taskId,
      });

      if (result && result.success && result.recommendation) {
        setRecommendationPayload(result.recommendation);
        setStatus("success");
      } else {
        throw new Error("Unable to generate valid recommendation.");
      }
    } catch (err) {
      console.error("AI Recommendation Error:", err);
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to fetch AI recommendation. Please try again.";
      setErrorMsg(message);
      setStatus("error");
    }
  };

  // Render Idle Action Trigger Button
  if (status === "idle") {
    return (
      <div className="ai-rec-container">
        <button
          type="button"
          className="ai-rec-trigger-btn"
          onClick={fetchRecommendation}
        >
          {buttonLabel}
        </button>
      </div>
    );
  }

  // Render Loading State (Prevents duplicate clicks)
  if (status === "loading") {
    return (
      <div className="ai-rec-container">
        <div className="ai-rec-loading-box">
          <div className="ai-rec-spinner" />
          <span>Analyzing eligible team members and workload evidence...</span>
        </div>
      </div>
    );
  }

  // Render Safe Error State with Retry
  if (status === "error") {
    return (
      <div className="ai-rec-container">
        <div className="ai-rec-error-box">
          <span>{errorMsg}</span>
          <button
            type="button"
            className="ai-rec-retry-btn"
            onClick={fetchRecommendation}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render Success Recommendation Card
  const aiRec = recommendationPayload?.aiRecommendation || {};
  const evidenceMetrics = recommendationPayload?.evidenceMetrics || {};
  const generatedAt = recommendationPayload?.generatedAt;

  // Extract Authoritative Deterministic Evidence for Recommended Employee
  const candidateList = evidenceMetrics.candidates || [];
  const matchedCandidate = candidateList.find(
    (c) => c.employeeId === aiRec.recommendedEmployeeId
  );

  const isNoRec = aiRec.noRecommendation || aiRec.insufficientEvidence || !aiRec.recommendedEmployeeId;

  return (
    <div className="ai-rec-container">
      <div className="ai-rec-card">
        {/* Card Header & AI Advisory Label */}
        <div className="ai-rec-header">
          <span className="ai-rec-badge">✨ AI Recommendation</span>
          {generatedAt && (
            <span className="ai-rec-timestamp">
              Generated {new Date(generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Candidate / Recommendation Hero Box */}
        {!isNoRec ? (
          <>
            <div className="ai-rec-employee-hero">
              <div>
                <h4 className="ai-rec-emp-name">
                  {aiRec.recommendedEmployeeName || matchedCandidate?.name || "Recommended Employee"}
                </h4>
                <p className="ai-rec-emp-sub">
                  {matchedCandidate
                    ? `${matchedCandidate.designation} • ${matchedCandidate.department}`
                    : "Eligible Team Candidate"}
                </p>
              </div>

              {aiRec.confidence && (
                <span className={`ai-rec-confidence-badge ${aiRec.confidence.toLowerCase()}`}>
                  {aiRec.confidence} Confidence
                </span>
              )}
            </div>

            {/* Why This Employee (AI Rationale) */}
            {aiRec.rationale && (
              <div>
                <div className="ai-rec-section-title">Why this employee?</div>
                <div className="ai-rec-rationale">{aiRec.rationale}</div>
              </div>
            )}

            {/* Authoritative Deterministic Metrics Chips (Source of Truth) */}
            {matchedCandidate && (
              <div>
                <div className="ai-rec-section-title">Factual Evidence</div>
                <div className="ai-rec-metrics-grid">
                  <div className="ai-rec-metric-card">
                    <div className="ai-rec-metric-value">
                      {matchedCandidate.workload?.activeTasks ?? 0}
                    </div>
                    <div className="ai-rec-metric-label">Active Tasks</div>
                  </div>

                  <div className="ai-rec-metric-card">
                    <div className="ai-rec-metric-value">
                      {matchedCandidate.performance?.completionRate != null
                        ? `${matchedCandidate.performance.completionRate}%`
                        : "N/A"}
                    </div>
                    <div className="ai-rec-metric-label">Completion Rate</div>
                  </div>

                  {matchedCandidate.projectHistory?.projectTaskCount !== undefined && (
                    <div className="ai-rec-metric-card">
                      <div className="ai-rec-metric-value">
                        {matchedCandidate.projectHistory.projectTaskCount}
                      </div>
                      <div className="ai-rec-metric-label">Project Tasks</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Insufficient Evidence / No Clear Recommendation Fallback */
          <div className="ai-rec-empty-state">
            <strong>No Clear Recommendation</strong>
            <p style={{ margin: "6px 0 0 0", fontSize: "12px" }}>
              {aiRec.rationale || "Current workload and historical evidence do not strongly single out a candidate."}
            </p>
          </div>
        )}

        {/* Limitations Notice */}
        {aiRec.limitations && aiRec.limitations.length > 0 && (
          <div className="ai-rec-limitations-box">
            <p>Analysis Limitations:</p>
            <ul>
              {aiRec.limitations.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Card Actions Row */}
        <div className="ai-rec-actions-row">
          <button
            type="button"
            className="ai-rec-regen-btn"
            onClick={fetchRecommendation}
          >
            Regenerate
          </button>

          {!isNoRec && onSelectEmployee && (
            <button
              type="button"
              className="ai-rec-use-btn"
              onClick={() => onSelectEmployee(aiRec.recommendedEmployeeId)}
            >
              ✓ Use Recommendation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AiRecommendationCard;
