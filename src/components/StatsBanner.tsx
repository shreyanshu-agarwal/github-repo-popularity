import { PerformanceMetrics } from "../types";
import { Card, Typography, LinearProgress, Chip, Box, Grid } from "@mui/material";
import { Wifi, Bolt, AccessTime, Shield } from "@mui/icons-material";

interface StatsBannerProps {
  metrics: PerformanceMetrics | null;
}

export default function StatsBanner({ metrics }: StatsBannerProps) {
  if (!metrics) return null;

  const limit = metrics.rateLimitLimit || 10;
  const remaining = metrics.rateLimitRemaining ?? 10;
  const percentage = Math.round((remaining / limit) * 100);

  // Remaining indicator colors
  let progressColor: "success" | "warning" | "error" = "success";
  if (percentage < 30) progressColor = "warning";
  if (percentage < 10) progressColor = "error";

  let resetTimeStr = "N/A";
  if (metrics.rateLimitReset) {
    try {
      const resetDate = new Date(metrics.rateLimitReset);
      resetTimeStr = resetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      // safe fallback
    }
  }

  return (
    <Grid 
      container 
      spacing={2} 
      id="stats-banner-container"
      sx={{ mb: 3 }}
    >
      {/* 1. Cache Status Card */}
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <Card id="stat-card-cache" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderColor: 'grey.200', height: '100%' }} variant="outlined">
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, display: 'block' }}>
              Backend Cache
            </Typography>
            <Chip 
              size="small" 
              label={metrics.isCached ? "Cache Hit (TTL: 5m)" : "Cache Miss (Fetched)"}
              sx={{ 
                mt: 1, 
                fontWeight: 'bold',
                bgcolor: metrics.isCached ? '#fffbeb' : '#eff6ff',
                color: metrics.isCached ? '#b45309' : '#1d4ed8',
                border: '1px solid',
                borderColor: metrics.isCached ? '#fde68a' : '#bfdbfe',
              }}
            />
          </Box>
          <Box sx={{ p: 1, bgcolor: 'grey.50', borderRadius: 2, color: 'text.secondary', display: 'flex', alignItems: 'center' }}>
            <Wifi sx={{ fontSize: 20 }} />
          </Box>
        </Card>
      </Grid>

      {/* 2. Latency Card */}
      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
        <Card id="stat-card-latency" sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderColor: 'grey.200', height: '100%' }} variant="outlined">
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, display: 'block' }}>
              Query Latency
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'text.primary' }}>
                {metrics.latencyMs}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                ms
              </Typography>
            </Box>
          </Box>
          <Box sx={{ p: 1, bgcolor: metrics.latencyMs < 50 ? '#ecfdf5' : 'grey.50', color: metrics.latencyMs < 50 ? '#059669' : 'text.secondary', borderRadius: 2, display: 'flex', alignItems: 'center' }}>
            <Bolt sx={{ fontSize: 20 }} />
          </Box>
        </Card>
      </Grid>

      {/* 3. Rate Limit Card */}
      <Grid size={{ xs: 12, sm: 12, md: 4 }}>
        <Card id="stat-card-rate" sx={{ p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderColor: 'grey.200', height: '100%' }} variant="outlined">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, display: 'block' }}>
                GitHub Rate Limit
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mt: 0.5 }}>
                {remaining} / {limit} requests
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, bgcolor: 'grey.50', borderRadius: 1.5 }}>
              <AccessTime sx={{ fontSize: 12, color: '#94a3b8' }} />
              <Typography sx={{ fontFamily: 'monospace', fontSize: '11px', color: 'text.secondary' }}>
                Reset: {resetTimeStr}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ width: '100%', mt: 0.5 }}>
            <LinearProgress 
              variant="determinate" 
              value={percentage} 
              color={progressColor}
              sx={{ height: 6, borderRadius: 3, bgcolor: 'grey.100' }}
            />
          </Box>

          {remaining <= 2 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1 }}>
              <Shield sx={{ fontSize: 14, color: '#dc2626' }} />
              <Typography sx={{ fontSize: '11px', color: '#dc2626', fontWeight: 'bold' }}>
                Rate limits depleted! Configure a GITHUB_TOKEN environment variable to raise limits to 5000 requests/hr.
              </Typography>
            </Box>
          )}
        </Card>
      </Grid>
    </Grid>
  );
}
