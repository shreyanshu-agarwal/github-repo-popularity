import { Repository } from "../types";
import { 
  Box, 
  Card, 
  Typography, 
  Avatar, 
  IconButton, 
  Button, 
  Skeleton, 
  Chip, 
  Grid,
  Divider,
  LinearProgress,
  Pagination
} from "@mui/material";
import { 
  Star as StarIcon, 
  ForkLeft as ForkIcon, 
  CalendarMonth as CalendarIcon, 
  OpenInNew as ExternalLinkIcon,
  EmojiEvents as AwardIcon,
  AutoAwesome as SparklesIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from "@mui/icons-material";

interface RepositoryListProps {
  repositories: Repository[];
  totalResults: number;
  page: number;
  perPage: number;
  onPageChange: (newPage: number) => void;
  isLoading: boolean;
}

export default function RepositoryList({
  repositories,
  totalResults,
  page,
  perPage,
  onPageChange,
  isLoading
}: RepositoryListProps) {
  
  if (isLoading && repositories.length === 0) {
    return (
      <Box id="repo-list-loading-skeleton" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[...Array(3)].map((_, i) => (
          <Card key={i} sx={{ p: 3, borderRadius: 3, borderColor: 'grey.100' }} variant="outlined">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Box sx={{ flexGrow: 1 }}>
                <Skeleton variant="text" width="30%" height={24} />
                <Skeleton variant="text" width="50%" height={16} />
              </Box>
              <Skeleton variant="rectangular" width={70} height={32} sx={{ borderRadius: 2 }} />
            </Box>
            <Skeleton variant="text" width="90%" height={20} sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Skeleton variant="text" width={80} height={20} />
              <Skeleton variant="text" width={80} height={20} />
            </Box>
          </Card>
        ))}
      </Box>
    );
  }

  if (repositories.length === 0) {
    return (
      <Card id="repo-list-empty-state" sx={{ textAlign: 'center', p: 6, borderRadius: 3, borderColor: 'grey.200' }} variant="outlined">
        <Box sx={{ display: 'inline-flex', p: 2, bgcolor: 'grey.50', color: 'grey.400', borderRadius: '50%', mb: 2 }}>
          <StarIcon sx={{ fontSize: 32 }} />
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 1 }}>
          No popular repositories matched
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', maxWidth: '360px', mx: 'auto' }}>
          Try expanding the creation date filter range, checking the language spelling, or ensuring your internet connection is active.
        </Typography>
      </Card>
    );
  }

  const totalPages = Math.ceil(totalResults / perPage);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <Box id="repository-list-container" sx={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' }}>
      
      {/* Sleek inline loading progress indicator */}
      {isLoading && (
        <LinearProgress 
          sx={{ 
            position: 'absolute', 
            top: -4, 
            left: 0, 
            right: 0, 
            height: 3, 
            borderRadius: 1.5,
            zIndex: 10
          }} 
        />
      )}
      
      {/* Header Results details */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1, opacity: isLoading ? 0.6 : 1 }}>
        <Typography sx={{ fontSize: '12px', color: 'text.secondary', fontWeight: 500 }}>
          Displaying {repositories.length} ranked results
        </Typography>
        <Typography sx={{ fontSize: '12px', color: 'text.secondary', fontWeight: 505 }}>
          Total simulated/matched: {totalResults} items
        </Typography>
      </Box>

      {/* Repositories listing */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {repositories.map((repo, index) => {
          const rank = (page - 1) * perPage + index + 1;

          // Ranking designs for top 3
          let rankBg = "#f1f5f9";
          let rankColor = "#475569";
          let medalIcon = null;
          if (rank === 1) {
            rankBg = "#eab308";
            rankColor = "#ffffff";
            medalIcon = <AwardIcon fontSize="inherit" sx={{ mr: 0.25 }} />;
          } else if (rank === 2) {
            rankBg = "#94a3b8";
            rankColor = "#ffffff";
            medalIcon = <AwardIcon fontSize="inherit" sx={{ mr: 0.25 }} />;
          } else if (rank === 3) {
            rankBg = "#b45309";
            rankColor = "#ffffff";
            medalIcon = <AwardIcon fontSize="inherit" sx={{ mr: 0.25 }} />;
          }

          // Score Badge design
          let scoreBg = "#f5f3ff";
          let scoreColor = "#4f46e5";
          let scoreBorder = "#ddd6fe";
          if (repo.score >= 80) {
            scoreBg = "#fff1f2";
            scoreColor = "#e11d48";
            scoreBorder = "#fecdd3";
          } else if (repo.score >= 50) {
            scoreBg = "#fffbeb";
            scoreColor = "#d97706";
            scoreBorder = "#fde68a";
          }

          return (
            <Card
              id={`repository-card-${repo.id}`}
              key={repo.id}
              sx={{ 
                p: 3, 
                borderRadius: 3, 
                borderColor: 'grey.200', 
                transition: 'all 0.2s', 
                '&:hover': {
                  borderColor: 'grey.350',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)'
                }
              }}
              variant="outlined"
            >
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 3.5 }}>
                
                {/* Meta details (Left side) */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexGrow: 1 }}>
                  
                  {/* Rank Positioning shield */}
                  <Box sx={{ 
                    width: 34, 
                    height: 34, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    borderRadius: 2, 
                    bgcolor: rankBg, 
                    color: rankColor, 
                    fontWeight: 'bold', 
                    fontSize: '13px', 
                    fontFamily: 'monospace',
                    flexShrink: 0,
                    userSelect: 'none'
                  }}>
                    {medalIcon}
                    {!medalIcon && rank}
                  </Box>

                  {/* Owner profile image and repo title */}
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Avatar
                      src={repo.ownerAvatarUrl}
                      alt={repo.fullName}
                      sx={{ width: 40, height: 40, border: '1px solid', borderColor: 'grey.100', bgcolor: 'grey.50' }}
                    />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.5, lineHeight: 1.2 }}>
                        {repo.name}
                        <IconButton
                          id={`repo-link-${repo.id}`}
                          href={repo.url}
                          target="_blank"
                          rel="noreferrer"
                          size="small"
                          sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'text.secondary' } }}
                          title="Open repo on GitHub"
                        >
                          <ExternalLinkIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Typography>
                      <Typography sx={{ fontSize: '11px', color: 'text.secondary', fontFamily: 'monospace', mt: 0.25 }}>
                        {repo.fullName}
                      </Typography>
                    </Box>
                  </Box>

                </Box>

                {/* Score indicators (Right side) */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'row', sm: 'column' }, alignItems: { xs: 'center', sm: 'flex-end' }, justifyContent: 'space-between', width: { xs: '100%', sm: 'auto' }, gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {repo.score >= 80 && (
                      <SparklesIcon sx={{ color: '#fda4af', fontSize: 18, display: { xs: 'none', sm: 'inline-block' } }} />
                    )}
                    <Box sx={{ 
                      px: 2, 
                      py: 0.75, 
                      borderRadius: 2.5, 
                      border: '1px solid', 
                      borderColor: scoreBorder, 
                      bgcolor: scoreBg, 
                      textAlign: 'center', 
                      minWidth: '100px' 
                    }}>
                      <Typography sx={{ fontSize: '8px', fontWeight: 'bold', color: scoreColor, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: -0.25 }}>
                        Popularity Score
                      </Typography>
                      <Typography sx={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'monospace', color: scoreColor }}>
                        {repo.score}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Components sub-breakdown metrics */}
                  <Box sx={{ display: 'flex', gap: 0.5, mt: { xs: 0, sm: 0.75 } }}>
                    <Box sx={{ px: 1, py: 0.25, bgcolor: '#f8fafc', border: '1px solid', borderColor: 'grey.200', borderRadius: 1 }}>
                      <Typography sx={{ fontSize: '10px', color: 'text.secondary', fontFamily: 'monospace' }}>
                        ★ {repo.breakdown.starsScore}
                      </Typography>
                    </Box>
                    <Box sx={{ px: 1, py: 0.25, bgcolor: '#f8fafc', border: '1px solid', borderColor: 'grey.200', borderRadius: 1 }}>
                      <Typography sx={{ fontSize: '10px', color: 'text.secondary', fontFamily: 'monospace' }}>
                        ⑂ {repo.breakdown.forksScore}
                      </Typography>
                    </Box>
                    <Box sx={{ px: 1, py: 0.25, bgcolor: '#f8fafc', border: '1px solid', borderColor: 'grey.200', borderRadius: 1 }} title="Recency factor decay">
                      <Typography sx={{ fontSize: '10px', color: 'text.secondary', fontFamily: 'monospace' }}>
                        ⏰ {repo.breakdown.recencyFactor}
                      </Typography>
                    </Box>
                  </Box>

                </Box>

              </Box>

              {/* Description */}
              {repo.description && (
                <Typography variant="body2" id={`desc-${repo.id}`} sx={{ color: 'text.secondary', mt: 2.25, pl: { xs: 0, sm: 6.5 }, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.6 }}>
                  {repo.description}
                </Typography>
              )}

              {/* Footer info breakdown */}
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                alignItems: 'center', 
                gap: 3, 
                mt: 2.25, 
                pt: 1.5, 
                borderTop: '1px solid', 
                borderColor: 'grey.50', 
                pl: { xs: 0, sm: 6.5 } 
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#475569' }}>
                  <StarIcon sx={{ color: '#eab308', fontSize: 16 }} />
                  <Typography sx={{ fontSize: '11px', fontWeight: '600' }}>
                    {repo.stars.toLocaleString()} Stars
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#475569' }}>
                  <ForkIcon sx={{ color: '#94a3b8', fontSize: 16 }} />
                  <Typography sx={{ fontSize: '11px', fontWeight: '600' }}>
                    {repo.forks.toLocaleString()} Forks
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto', color: 'text.secondary' }}>
                  <CalendarIcon sx={{ color: 'grey.300', fontSize: 16 }} />
                  <Typography sx={{ fontSize: '11px' }}>
                    Updated: <Box component="span" sx={{ fontWeight: '600', color: 'text.primary' }}>{formatDate(repo.updatedAt)}</Box>
                  </Typography>
                </Box>
              </Box>

            </Card>
          );
        })}
      </Box>

      {/* Pagination Footer controls */}
      {totalPages > 1 && (
        <Box id="repo-list-pagination" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 4, pt: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, value) => onPageChange(value)}
            color="primary"
            variant="outlined"
            shape="rounded"
            sx={{
              '& .MuiPaginationItem-root': {
                fontWeight: 'bold',
                borderRadius: 2,
              }
            }}
          />
        </Box>
      )}

    </Box>
  );
}
