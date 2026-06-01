import { Card, Box, Typography, List, ListItem, ListItemText, Grid } from "@mui/material";
import { Info as InfoIcon, Help as HelpIcon } from "@mui/icons-material";

export default function ScoringGuide() {
  return (
    <Card id="scoring-guide-box" sx={{ p: 4, mb: 3, borderRadius: 3, bgcolor: '#f8fafc', borderColor: 'grey.200' }} variant="outlined">
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Box sx={{ p: 1, bgcolor: '#e0e7ff', color: '#4f46e5', borderRadius: 2, display: 'flex', alignItems: 'center' }}>
          <InfoIcon />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
            Scoring Formula & Rationale
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            To rank repository popularity equitably across different ages and sizes, the backend implements a Weighted Logarithmic Scoring algorithm.
          </Typography>
        </Box>
      </Box>

      {/* Grid columns using standard Grid container */}
      <Grid 
        container 
        spacing={4} 
        sx={{ 
          mt: 1, 
          pt: 3, 
          borderTop: '1px solid', 
          borderColor: 'grey.200' 
        }}
      >
        
        {/* Math Formula Panel */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card id="math-formula-panel" sx={{ p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderColor: 'grey.100', bgcolor: '#ffffff', height: '100%' }} variant="outlined">
            <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'indigo.600', textTransform: 'uppercase', letterSpacing: 1.5, display: 'block', mb: 2, textAlign: 'center' }}>
              Final Mathematical Model
            </Typography>
            
            <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.primary', pb: 1, mb: 1.5, borderBottom: '1px solid', borderColor: 'grey.200', textAlign: 'center', fontFamily: 'monospace' }}>
                Popularity Score (0-100)
              </Typography>
              <Box sx={{ fontFamily: 'monospace', fontSize: '11px', color: 'text.secondary', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                  raw_score = 
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#1d4ed8', pl: 2 }}>
                  0.6 * log₁₀(stars + 1) +
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#b45309', pl: 2 }}>
                  0.3 * log₁₀(forks + 1) +
                </Typography>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#047857', pl: 2 }}>
                  0.1 * exp(-days_since_update / 90)
                </Typography>
              </Box>
              <Box sx={{ borderTop: '1px solid', borderColor: 'grey.200', pt: 1.5, mt: 1.5, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#4f46e5', fontWeight: 'bold', fontFamily: 'monospace' }}>
                  scaled_score = Math.min(100, raw_score * 22.0)
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Justification of Weights */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Box id="weights-rationale-panel" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
              <HelpIcon fontSize="small" sx={{ color: 'indigo.500' }} />
              Weighted Coefficient Justifications
            </Typography>
            
            <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <ListItem disableGutters disablePadding sx={{ alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ py: 0.5, px: 1.5, bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '11px', borderRadius: 1.5, minWidth: '48px', textAlign: 'center' }}>
                  60%
                </Box>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                      Stars (Absolute Developer Validation):
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.25, display: 'block' }}>
                      Stars represent a strong developer vote-of-confidence and general traction. It receives the leading weight.
                    </Typography>
                  }
                />
              </ListItem>

              <ListItem disableGutters disablePadding sx={{ alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ py: 0.5, px: 1.5, bgcolor: '#fffbeb', color: '#b45309', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '11px', borderRadius: 1.5, minWidth: '48px', textAlign: 'center' }}>
                  30%
                </Box>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                      Forks (Active Codebase Utilization):
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.25, display: 'block' }}>
                      Forks indicate a willingness to modify, integrate, or extend the logic. This represents actual active community building and utilization.
                    </Typography>
                  }
                />
              </ListItem>

              <ListItem disableGutters disablePadding sx={{ alignItems: 'flex-start', gap: 2 }}>
                <Box sx={{ py: 0.5, px: 1.5, bgcolor: '#ecfdf5', color: '#047857', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '11px', borderRadius: 1.5, minWidth: '48px', textAlign: 'center' }}>
                  10%
                </Box>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                      Recency (Update Decay Factor):
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.25, display: 'block' }}>
                      Exponential decay penalizes inactive or abandoned projects. A half-life of roughly 62 days ensures active maintenance maintains a significant boost.
                    </Typography>
                  }
                />
              </ListItem>
            </List>
          </Box>
        </Grid>

      </Grid>

      {/* Advantages and Tradeoffs */}
      <Grid 
        container 
        spacing={4} 
        sx={{ 
          mt: 2, 
          pt: 3, 
          borderTop: '1px solid', 
          borderColor: 'grey.200' 
        }}
      >
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 1 }}>
            Advantages
          </Typography>
          <Box component="ul" sx={{ pl: 2, m: 0, color: 'text.secondary', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <li><strong>Anti-Dominance:</strong> Logarithmic dampening prevents legendary projects with millions of stars from scaling exponentially and completely locking out promising newcomers.</li>
            <li><strong>Equitable Decay:</strong> Exponential time-decay mimics a natural gravity, encouraging active development to remain at top listings.</li>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 1 }}>
            Tradeoffs & Edge Cases
          </Typography>
          <Box component="ul" sx={{ pl: 2, m: 0, color: 'text.secondary', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: 1 }}>
            <li><strong>Maintenance bias:</strong> Some perfectly completed projects are complete, bug-free, and require zero updates, but decay under recency rules.</li>
            <li><strong>Star buying / hype:</strong> Star-farming isn't caught, though fork weights help filter out un-forked marketing repo hype lists.</li>
          </Box>
        </Grid>
      </Grid>
    </Card>
  );
}
