import { useState, useEffect, useCallback } from "react";
import { Repository, PerformanceMetrics, SearchResponse } from "./types";
import { 
  ThemeProvider, 
  createTheme, 
  CssBaseline, 
  Box, 
  Container, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Tabs, 
  Tab, 
  Alert, 
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { 
  GitHub as GithubIcon, 
  Search as SearchIcon, 
  CheckCircle as CheckCircleIcon,
  EmojiEvents as AwardIcon
} from "@mui/icons-material";

import StatsBanner from "./components/StatsBanner";
import FilterPanel from "./components/FilterPanel";
import ScoringGuide from "./components/ScoringGuide";
import DiagnosticDashboard from "./components/DiagnosticDashboard";
import RepositoryList from "./components/RepositoryList";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Define a unified highly-polished Design System theme using Material UI tokens
const theme = createTheme({
  palette: {
    primary: {
      main: '#4f46e5', // indigo 600
      dark: '#4338ca', // indigo 700
      light: '#e0e7ff', // indigo 50
    },
    secondary: {
      main: '#0f172a', // slate 900
      dark: '#1e293b', // slate 800
      light: '#f1f5f9', // slate 100
    },
    background: {
      default: '#f8fafc', // slate 50
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a', // slate 900
      secondary: '#475569', // slate 600
    },
  },
  typography: {
    fontFamily: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontWeight: 900,
    },
    h2: {
      fontWeight: 800,
    },
    h3: {
      fontWeight: 700,
    },
    subtitle2: {
      fontWeight: 'bold',
    },
    body2: {
      fontSize: '0.875rem',
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 10,
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        }
      }
    }
  }
});

// Unified application default configuration constants
const DEFAULT_LANGUAGE = "typescript";
const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 10;

const TAB_INDEX_SEARCH_RANK = 0;
const TAB_INDEX_WEIGHT_MODEL = 1;
const TAB_INDEX_TESTING_SUITE = 2;

export default function App() {
  const getDefaultDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split("T")[0];
  };

  const [language, setLanguage] = useState<string>(DEFAULT_LANGUAGE);
  const [createdAfter, setCreatedAfter] = useState<string>(getDefaultDate());
  const [page, setPage] = useState<number>(DEFAULT_PAGE);
  const [perPage] = useState<number>(DEFAULT_PER_PAGE);

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isErrorDialogOpen, setIsErrorDialogOpen] = useState<boolean>(false);

  // Active view tab index (mapped to tab positions directly)
  const [tabIndex, setTabIndex] = useState<number>(TAB_INDEX_SEARCH_RANK);

  // Fetch logic with support for metrics tracking, timeout constraints, and exponential backoff retry loops
  const fetchRankedRepositories = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    setIsErrorDialogOpen(false);

    const maxAttempts = 3;
    let attempt = 0;
    let delayMs = 1000;
    let fetchError: any = null;

    while (attempt < maxAttempts) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 8000); // 8 second request timeout threshold

      try {
        const queryParams = new URLSearchParams({
          language,
          createdAfter,
          page: page.toString(),
          perPage: perPage.toString()
        });

        if (forceRefresh) {
          queryParams.set("refresh", "true");
        }

        const url = `/api/repositories?${queryParams.toString()}`;
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errMsg = `Failed with HTTP status code ${response.status}`;
          try {
            const errPayload = await response.json();
            if (errPayload && errPayload.message) {
              errMsg = errPayload.message;
            }
          } catch {
            // ignore
          }
          throw new Error(errMsg);
        }

        const payload: SearchResponse = await response.json();
        setRepositories(payload.repositories || []);
        setTotalCount(payload.totalCount || 0);
        setMetrics(payload.metrics || null);
        
        // Succeeded - exit retry loop
        setIsLoading(false);
        return;
      } catch (err: any) {
        clearTimeout(timeoutId);
        
        const isAbort = err.name === "AbortError";
        const cleanMsg = isAbort ? "Request timed out after 8 seconds." : (err?.message || String(err));
        console.warn(`[Fetch Retry Warning] Attempt ${attempt + 1} failed: ${cleanMsg}`);
        
        fetchError = new Error(cleanMsg);
        attempt++;

        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          delayMs *= 2; // exponential backoff
        }
      }
    }

    // Exhausted all retries, render failure
    console.error("Fetch failed after exhausting all retry loops:", fetchError);
    setError(fetchError?.message || "Could not retrieve ranked repositories from server after multiple retries.");
    setIsLoading(false);
    setIsErrorDialogOpen(true);
  }, [language, createdAfter, page, perPage]);

  // Trigger search on filter/page changes
  useEffect(() => {
    fetchRankedRepositories(false);
  }, [fetchRankedRepositories]);

  const handleApplyFilters = (newLang: string, newDate: string) => {
    setLanguage(newLang);
    setCreatedAfter(newDate);
    setPage(1); // Reset page on filter changes
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <Box id="app-root-container" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        
        {/* Unified Application Header Bar */}
        <AppBar id="app-header" position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'grey.200', bgcolor: 'background.paper', zIndex: 1100 }}>
          <Container maxWidth="lg">
            <Toolbar disableGutters sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', justifyContent: 'space-between', py: { xs: 2, sm: 1 }, gap: 2 }}>
              
              {/* Brand Logo Header block */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ p: 1, bgcolor: 'secondary.main', color: 'common.white', borderRadius: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GithubIcon />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: 'text.primary', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                    GitHub Popularity Ranker
                  </Typography>
                  <Typography sx={{ fontSize: '11px', fontWeight: 'bold', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: 'monospace', mt: 0.25 }}>
                    Full-Stack Ranking Pipeline
                  </Typography>
                </Box>
              </Box>

              {/* Navigation Controllers */}
              <Tabs 
                id="app-nav-tabs" 
                value={tabIndex} 
                onChange={handleTabChange} 
                textColor="primary" 
                indicatorColor="primary"
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    minWidth: { xs: '90px', sm: '120px' },
                    py: 1,
                  }
                }}
              >
                <Tab id="tab-search" label="Search & Rank" icon={<SearchIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
                <Tab id="tab-formula" label="Weight Model" icon={<AwardIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
                <Tab id="tab-tests" label="Testing Suite" icon={<CheckCircleIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
              </Tabs>

            </Toolbar>
          </Container>
        </AppBar>

        {/* Dynamic Content Frame wrapper */}
        <Box id="app-main-content" component="main" sx={{ flexGrow: 1, py: 4 }}>
          <Container maxWidth="lg">
            
            {tabIndex === TAB_INDEX_SEARCH_RANK && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* 1. Filtering layout */}
                <FilterPanel
                  initialLanguage={language}
                  initialCreatedAfter={createdAfter}
                  onApplyFilters={handleApplyFilters}
                  onRefresh={() => fetchRankedRepositories(true)}
                  isLoading={isLoading}
                />

                {/* 2. Visual diagnostics feedback banner */}
                <StatsBanner metrics={metrics} />

                {/* 3. Server connectivity warning indicators */}
                {error && (
                  <Alert 
                    id="fetch-error-banner" 
                    severity="error" 
                    sx={{ borderRadius: 2 }}
                    action={
                      <Button color="inherit" size="small" onClick={() => fetchRankedRepositories(false)} sx={{ fontWeight: 'bold' }}>
                        Retry Search
                      </Button>
                    }
                  >
                    {error}
                  </Alert>
                )}

                {/* 4. Repository listings content list */}
                <RepositoryList
                  repositories={repositories}
                  totalResults={totalCount}
                  page={page}
                  perPage={perPage}
                  onPageChange={setPage}
                  isLoading={isLoading}
                />
              </Box>
            )}

            {tabIndex === TAB_INDEX_WEIGHT_MODEL && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                  Scoring Methodology Specification
                </Typography>
                <ScoringGuide />
              </Box>
            )}

            {tabIndex === TAB_INDEX_TESTING_SUITE && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <DiagnosticDashboard />
              </Box>
            )}

          </Container>
        </Box>

        {/* Human Footprint */}
        <Box component="footer" sx={{ py: 3.5, mt: 'auto', borderTop: '1px solid', borderColor: 'grey.150', bgcolor: 'background.paper', textAlign: 'center', userSelect: 'none' }}>
          <Container maxWidth="lg">
            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 500 }}>
              GitHub Popularity Ranker © 2026. Powered by Material UI Design Tokens.
            </Typography>
          </Container>
        </Box>

        {/* Error Popup Dialog */}
        <Dialog
          id="error-popup-dialog"
          open={isErrorDialogOpen}
          onClose={() => setIsErrorDialogOpen(false)}
          sx={{
            '& .MuiDialog-paper': {
              borderRadius: 3,
              p: 1.5,
              maxWidth: '480px'
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1.5, color: 'error.main', pb: 1 }}>
            ⚠️ API Request Failed
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ color: 'text.primary', fontSize: '14px', lineHeight: 1.6, mb: 1.5 }}>
              The GitHub search & ranking service encountered a problem of connectivity or rate-limiting:
            </DialogContentText>
            <Box sx={{ p: 2, bgcolor: '#fff1f2', border: '1px solid', borderColor: '#fecdd3', borderRadius: 2, mb: 2 }}>
              <Typography sx={{ fontFamily: 'monospace', fontSize: '12px', color: '#be123c', wordBreak: 'break-word' }}>
                {error}
              </Typography>
            </Box>
            <DialogContentText sx={{ color: 'text.secondary', fontSize: '12px', lineHeight: 1.5 }}>
              If you are hitting GitHub API rate-limits, you can increase your quota by defining a <strong>GITHUB_TOKEN</strong> environment variable.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ gap: 1, px: 3, pb: 2 }}>
            <Button onClick={() => setIsErrorDialogOpen(false)} sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
              Dismiss
            </Button>
            <Button 
              id="dialog-retry-button"
              variant="contained" 
              color="primary" 
              onClick={() => {
                setIsErrorDialogOpen(false);
                fetchRankedRepositories(true);
              }}
              sx={{ fontWeight: 'bold' }}
            >
              Retry
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
