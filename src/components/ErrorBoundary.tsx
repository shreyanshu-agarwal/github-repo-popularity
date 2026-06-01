import React, { Component, ErrorInfo, ReactNode } from "react";
import { Box, Card, CardContent, Typography, Button, Alert, Collapse } from "@mui/material";
import { Refresh as RefreshIcon, DeveloperMode as ErrorIcon } from "@mui/icons-material";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false
    };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled rendering error:", error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    });
    window.location.reload();
  };

  public override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          id="error-boundary-container"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            backgroundColor: "#f8fafc",
            p: 3
          }}
        >
          <Card id="error-boundary-card" sx={{ maxWidth: 680, width: "100%", boxShadow: 3, borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                <ErrorIcon color="error" sx={{ fontSize: 40 }} />
                <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                  Oops! Something went wrong
                </Typography>
              </Box>

              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                An unexpected rendering anomaly occurred in the user interface.
              </Alert>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                The application encountered an unhandled exception. Don't worry—your current session and server configurations remain safe. Try reloading the application below to reset the interface framework.
              </Typography>

              <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                <Button
                  id="error-boundary-reload-btn"
                  variant="contained"
                  color="primary"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleReset}
                >
                  Reload Application
                </Button>
                <Button
                  id="error-boundary-details-btn"
                  variant="outlined"
                  onClick={() => this.setState(prev => ({ showDetails: !prev }))}
                >
                  {this.state.showDetails ? "Hide Technical Details" : "Show Technical Details"}
                </Button>
              </Box>

              <Collapse in={this.state.showDetails}>
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: "#1e293b",
                    borderRadius: 2,
                    color: "#f1f5f9",
                    fontFamily: "monospace",
                    fontSize: "0.75rem",
                    overflowX: "auto",
                    maxHeight: 250
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: "#ef4444", mb: 1, fontWeight: "bold" }}>
                    Stack Trace:
                  </Typography>
                  <pre style={{ margin: 0 }}>
                    {this.state.error?.stack || this.state.error?.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <>
                      <Typography variant="subtitle2" sx={{ color: "#38bdf8", mt: 2, mb: 1, fontWeight: "bold" }}>
                        Component Stack:
                      </Typography>
                      <pre style={{ margin: 0 }}>
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </Box>
              </Collapse>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}
