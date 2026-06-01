import React, { useState } from "react";
import { Card, Box, Typography, Button, TextField, Grid } from "@mui/material";
import { 
  Search as SearchIcon, 
  CalendarMonth as CalendarIcon, 
  Code as CodeIcon, 
  RestartAlt as ResetIcon,
  Refresh as RefreshIcon
} from "@mui/icons-material";

interface FilterPanelProps {
  initialLanguage: string;
  initialCreatedAfter: string;
  onApplyFilters: (language: string, createdAfter: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const POPULAR_LANGUAGES = [
  { value: "typescript", label: "TypeScript", color: "#3178c6" },
  { value: "javascript", label: "JavaScript", color: "#f1e05a" },
  { value: "python", label: "Python", color: "#3572A5" },
  { value: "rust", label: "Rust", color: "#dea584" },
  { value: "go", label: "Go", color: "#00ADD8" },
  { value: "all", label: "All Languages", color: "#64748b" }
];

export default function FilterPanel({
  initialLanguage,
  initialCreatedAfter,
  onApplyFilters,
  onRefresh,
  isLoading
}: FilterPanelProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>(
    POPULAR_LANGUAGES.some(l => l.value === initialLanguage) ? initialLanguage : "custom"
  );
  const [customLanguage, setCustomLanguage] = useState<string>(
    POPULAR_LANGUAGES.some(l => l.value === initialLanguage) ? "" : initialLanguage
  );
  const [createdAfter, setCreatedAfter] = useState<string>(initialCreatedAfter);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const activeLang = selectedPreset === "custom" ? customLanguage.trim() : selectedPreset;
    onApplyFilters(activeLang || "typescript", createdAfter);
  };

  const handlePresetSelect = (preset: string) => {
    setSelectedPreset(preset);
    const activeLang = preset === "custom" ? customLanguage.trim() : preset;
    onApplyFilters(activeLang || "typescript", createdAfter);
  };

  const handleReset = () => {
    setSelectedPreset("typescript");
    setCustomLanguage("");
    
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const dateStr = oneYearAgo.toISOString().split("T")[0];
    setCreatedAfter(dateStr);

    onApplyFilters("typescript", dateStr);
  };

  return (
    <Card id="filter-panel-card" sx={{ p: 3, mb: 3, borderRadius: 3, borderColor: 'grey.200' }} variant="outlined">
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3} sx={{ alignItems: 'flex-end' }}>
          
          {/* Main programming language selector */}
          <Grid size={{ xs: 12 }} id="language-presets-block">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                <CodeIcon fontSize="small" sx={{ color: 'indigo.500' }} />
                Programming Language
              </Typography>
              
              {/* Presets Grid */}
              <Grid container spacing={1} sx={{ mb: 1 }}>
                {POPULAR_LANGUAGES.map((lang) => {
                  const isActive = selectedPreset === lang.value;
                  return (
                    <Grid size={{ xs: 4, sm: 2 }} key={lang.value}>
                      <Button
                        id={`preset-${lang.value}`}
                        size="small"
                        onClick={() => handlePresetSelect(lang.value)}
                        variant={isActive ? "contained" : "outlined"}
                        sx={{
                          py: 1,
                          px: 0.5,
                          width: '100%',
                          textTransform: 'none',
                          fontSize: '11px',
                          borderRadius: 2,
                          fontWeight: 'bold',
                          color: isActive ? '#fff' : 'text.secondary',
                          bgcolor: isActive ? '#0f172a' : 'transparent',
                          borderColor: isActive ? '#0f172a' : 'grey.300',
                          '&:hover': {
                            bgcolor: isActive ? '#1e293b' : 'grey.100',
                            borderColor: isActive ? '#1e293b' : 'grey.400',
                          },
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 0.5,
                          height: '100%',
                          minHeight: '48px'
                        }}
                      >
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: lang.color }} />
                        {lang.label}
                      </Button>
                    </Grid>
                  );
                })}
              </Grid>

              {/* Custom Language field */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  id="preset-custom-toggle"
                  size="small"
                  variant={selectedPreset === "custom" ? "contained" : "outlined"}
                  onClick={() => setSelectedPreset("custom")}
                  sx={{
                    textTransform: 'none',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    py: 1.1,
                    px: 1.5,
                    borderRadius: 2,
                    whiteSpace: 'nowrap'
                  }}
                >
                  Custom:
                </Button>
                <TextField
                  id="custom-lang-input"
                  size="small"
                  fullWidth
                  placeholder="e.g. rust, kotlin, cobol"
                  value={customLanguage}
                  onFocus={() => {
                    setSelectedPreset("custom");
                  }}
                  onClick={() => {
                    setSelectedPreset("custom");
                  }}
                  onChange={(e) => {
                    setCustomLanguage(e.target.value);
                    setSelectedPreset("custom");
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '13px',
                      py: 0.85
                    }
                  }}
                />
              </Box>
            </Box>
          </Grid>

          {/* Creation Date field */}
          <Grid size={{ xs: 12, sm: 4 }} id="created-date-block">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarIcon fontSize="small" sx={{ color: '#4f46e5' }} />
                Created After
              </Typography>
              <TextField
                id="created-after-date-picker"
                type="date"
                size="small"
                fullWidth
                value={createdAfter}
                onChange={(e) => setCreatedAfter(e.target.value)}
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: '13px',
                    py: 1.1
                  }
                }}
              />
            </Box>
          </Grid>

          {/* Search Trigger buttons */}
          <Grid size={{ xs: 12, sm: 8 }} id="filter-actions-block">
            <Box sx={{ 
              display: 'flex', 
              gap: 1.5, 
              width: '100%', 
              justifyContent: { xs: 'stretch', sm: 'flex-end' },
              flexWrap: { xs: 'wrap', sm: 'nowrap' }
            }}>
              <Button
                id="search-apply-button"
                type="submit"
                variant="contained"
                disabled={isLoading}
                startIcon={<SearchIcon />}
                sx={{
                  py: 1.1,
                  px: 3,
                  textTransform: 'none',
                  borderRadius: 2.5,
                  fontWeight: 'bold',
                  boxShadow: 'none',
                  bgcolor: '#4f46e5',
                  width: { xs: '100%', sm: 'auto' },
                  '&:hover': {
                    bgcolor: '#4338ca',
                    boxShadow: 'none'
                  }
                }}
              >
                {isLoading ? "Searching..." : "Apply Filters"}
              </Button>
              <Button
                id="explicit-refresh-button"
                variant="outlined"
                onClick={onRefresh}
                disabled={isLoading}
                title="Force Refresh Data"
                startIcon={<RefreshIcon />}
                sx={{
                  color: 'primary.main',
                  borderColor: 'primary.light',
                  textTransform: 'none',
                  fontWeight: 'bold',
                  px: 2.5,
                  py: 1.1,
                  borderRadius: 2.5,
                  whiteSpace: 'nowrap',
                  width: { xs: '100%', sm: 'auto' },
                  flexGrow: { xs: 1, sm: 0 },
                  '&:hover': {
                    bgcolor: 'primary.light',
                    borderColor: 'primary.main'
                  }
                }}
              >
                Refresh
              </Button>
              <Button
                id="filter-reset-button"
                variant="outlined"
                onClick={handleReset}
                title="Reset to defaults"
                sx={{
                  color: 'text.secondary',
                  borderColor: 'grey.300',
                  minWidth: '44px',
                  p: 1.1,
                  borderRadius: 2.5,
                  '&:hover': {
                    bgcolor: 'grey.150',
                    borderColor: 'grey.400'
                  }
                }}
              >
                <ResetIcon fontSize="small" />
              </Button>
            </Box>
          </Grid>

        </Grid>
      </form>
    </Card>
  );
}
