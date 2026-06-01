import { useState, useEffect } from "react";
import { TestSuiteResult } from "../types";
import { Card, Box, Typography, Button, CircularProgress, Alert, AlertTitle, Grid } from "@mui/material";
import { 
  CheckCircle as PassedIcon, 
  Cancel as FailedIcon, 
  PlayArrow as PlayIcon, 
  AutoAwesome as SparklesIcon
} from "@mui/icons-material";

export default function DiagnosticDashboard() {
  const [suites, setSuites] = useState<TestSuiteResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const fetchAndRunTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tests/run", {
        headers: { Accept: "application/json" }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setSuites(data.suites || []);
      setLastRun(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error("Test execution failed:", err);
      setError(err?.message || "Could not reach test backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndRunTests();
  }, []);

  const totalTests = suites.reduce((acc, suite) => acc + suite.results.length, 0);
  const passedTests = suites.reduce(
    (acc, suite) => acc + suite.results.filter(r => r.passed).length,
    0
  );
  const percentPassed = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  return (
    <Card id="diagnostic-dashboard-card" sx={{ p: 4, mb: 3, borderRadius: 3, borderColor: 'grey.200' }} variant="outlined">
      
      {/* Visual Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 2, pb: 2.5, borderBottom: '1px solid', borderColor: 'grey.100' }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
              Visual Diagnostics & Unit Test Suite
            </Typography>
            <Box sx={{ px: 1, py: 0.25, bgcolor: '#eff6ff', color: '#1d4ed8', borderRadius: 1.5 }}>
              <Typography variant="caption" sx={{ fontSize: '9px', fontWeight: 'bold' }}>
                VERIFICATION ENGINE
              </Typography>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
            Validates scoring formula boundaries, cache fallbacks, mock search behavior, and query schemas in real time.
          </Typography>
        </Box>

        <Button
          id="trigger-test-harness-btn"
          variant="contained"
          disabled={loading}
          onClick={fetchAndRunTests}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <PlayIcon />}
          sx={{
            py: 1,
            px: 2.5,
            textTransform: 'none',
            fontSize: '12px',
            borderRadius: 2.5,
            fontWeight: 'bold',
            boxShadow: 'none',
            bgcolor: '#0f172a',
            '&:hover': {
              bgcolor: '#1e293b',
              boxShadow: 'none'
            }
          }}
        >
          {loading ? "Triggering..." : "Execute Test Suites"}
        </Button>
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }} id="harness-error-alert">
          <AlertTitle sx={{ fontWeight: 'bold' }}>Harness Error</AlertTitle>
          {error} — Ensure the full-stack server is active at port 3000.
        </Alert>
      ) : (
        <Box sx={{ mt: 3 }}>
          
          {/* Test Metrics Banner Grid using standard Grid items */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Execution Integrity
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  {percentPassed === 100 ? (
                    <SparklesIcon sx={{ color: '#4f46e5' }} />
                  ) : null}
                  {percentPassed}% Passing
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Assertions Checked
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary', mt: 0.5 }}>
                  {passedTests} / {totalTests} cases
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Last Active Iteration
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'medium', fontFamily: 'monospace', color: 'text.secondary', mt: 1 }}>
                  {lastRun ? lastRun : "Waiting to execute..."}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Test Suite Iteration Grid */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {suites.map((suite, sIdx) => (
              <Box key={sIdx}>
                <Card sx={{ borderColor: 'grey.200', borderRadius: 2 }} variant="outlined">
                  
                  {/* Suite header */}
                  <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: suite.passed ? '#f8fafc' : '#fef2f2', borderBottom: '1px solid', borderColor: 'grey.150' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {suite.passed ? (
                        <PassedIcon fontSize="small" sx={{ color: '#10b981' }} />
                      ) : (
                        <FailedIcon fontSize="small" sx={{ color: '#f43f5e' }} />
                      )}
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                        {suite.name}
                      </Typography>
                    </Box>
                    <Box sx={{ px: 1.5, py: 0.25, bgcolor: suite.passed ? '#d1fae5' : '#fee2e2', color: suite.passed ? '#065f46' : '#991b1b', borderRadius: 1 }}>
                      <Typography sx={{ fontSize: '10px', fontWeight: 'bold' }}>
                        {suite.passed ? "PASSED" : "FAILED"}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Assertion cases list */}
                  <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {suite.results.map((tc, tcIdx) => (
                      <Box key={tcIdx} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            {tc.name}
                          </Typography>
                          {tc.message && (
                            <Typography sx={{ fontFamily: 'monospace', fontSize: '11px', color: 'text.secondary', mt: 0.5 }}>
                              {tc.message}
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: tc.passed ? '#059669' : '#e11d48', whiteSpace: 'nowrap' }}>
                          {tc.passed ? "✔ Ok" : "✘ Failed"}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                </Card>
              </Box>
            ))}
          </Box>

        </Box>
      )}
    </Card>
  );
}
