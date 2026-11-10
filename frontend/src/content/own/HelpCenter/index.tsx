import {
  KeyboardEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  alpha,
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardActionArea,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputLabel,
  InputAdornment,
  LinearProgress,
  InputBase,
  Link,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { PermissionEntity } from '../../../models/owns/role';
import { DocumentationArticle } from '../../../models/owns/documentation';
import api from '../../../utils/api';
import { apiUrl } from '../../../config';
import useAuth from '../../../hooks/useAuth';
import { useBrand } from '../../../hooks/useBrand';
import { hydrateAuthorizedImages } from './authorizedImages';
import { normalizeHelpSearch } from './normalizeHelpSearch';
import { getSearchExcerpt, Highlight } from './searchPresentation';
import useCompactDialog from '../../../hooks/useCompactDialog';

type Guide = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  permission?: PermissionEntity;
  href?: string;
  icon: ReactNode;
  keywords: string[];
  categoryTitle?: string;
  contentHtml?: string;
  updatedAt?: string;
};

const helpRoot = '/app/help';
const navStorageKey = 'qpm-help-navigation-open';
const guideSlugAliases: Record<string, string> = {
  'maintenance-requests': 'requests',
  requests: 'maintenance-requests',
  'parts-inventory': 'inventory',
  inventory: 'parts-inventory',
  'work-order-planning': 'planning',
  planning: 'work-order-planning',
  'profile-preferences': 'account',
  account: 'profile-preferences'
};

const getArticleContentText = (html: string): string => {
  const documentBody = document.createElement('div');
  documentBody.innerHTML = html;
  return documentBody.textContent ?? '';
};

const getCategoryKey = (guide: Guide): string =>
  `category:${guide.categoryTitle ?? guide.title}`;

const readNavigationState = (): Record<string, boolean> => {
  try {
    const value = window.localStorage.getItem(navStorageKey);
    return value ? JSON.parse(value) : {};
  } catch (_error) {
    return {};
  }
};

export default function HelpCenter() {
  const isCompactDialog = useCompactDialog();
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage?.toLowerCase().startsWith('fr')
    ? 'fr'
    : 'en';
  const { name } = useBrand();
  const { hasViewPermission } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const isTablet = useMediaQuery(theme.breakpoints.up('md'));
  const [query, setQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openCategories, setOpenCategories] =
    useState<Record<string, boolean>>(readNavigationState);
  const [activeSection, setActiveSection] = useState('overview');
  const [expandedImage, setExpandedImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);
  const [hydratedArticle, setHydratedArticle] = useState<{
    slug: string;
    html: string;
  } | null>(null);
  const [databaseArticles, setDatabaseArticles] = useState<
    DocumentationArticle[] | null
  >(null);
  // Distinguish loading from failure: on error the bundled guides stay available,
  // but the user is told that published articles could not be loaded.
  const [articlesStatus, setArticlesStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading');
  const [articlesReload, setArticlesReload] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearchCategory('');
    setActiveSuggestion(0);
  }, [locale]);

  useEffect(() => {
    let mounted = true;
    setArticlesStatus('loading');
    api
      .get<DocumentationArticle[]>(`documentation/articles?locale=${locale}`)
      .then((articles) => {
        if (!mounted) return;
        setDatabaseArticles(articles);
        setArticlesStatus('ready');
      })
      .catch(() => {
        if (!mounted) return;
        setDatabaseArticles(null);
        setArticlesStatus('error');
      });
    return () => {
      mounted = false;
    };
  }, [locale, articlesReload]);

  const localGuides = useMemo<Guide[]>(
    () => [
      {
        id: 'work-orders',
        title: t('help_work_orders_title'),
        summary: t('help_work_orders_summary'),
        steps: [
          t('help_work_orders_step_1'),
          t('help_work_orders_step_2'),
          t('help_work_orders_step_3'),
          t('help_work_orders_step_4')
        ],
        permission: PermissionEntity.WORK_ORDERS,
        href: '/app/work-orders',
        icon: <AssignmentOutlinedIcon />,
        keywords: ['work order', 'maintenance', 'confirm', 'operations']
      },
      {
        id: 'requests',
        title: t('help_requests_title'),
        summary: t('help_requests_summary'),
        steps: [
          t('help_requests_step_1'),
          t('help_requests_step_2'),
          t('help_requests_step_3')
        ],
        permission: PermissionEntity.REQUESTS,
        href: '/app/requests',
        icon: <HelpOutlineOutlinedIcon />,
        keywords: ['request', 'intervention', 'issue', 'maintenance']
      },
      {
        id: 'equipment',
        title: t('help_equipment_title'),
        summary: t('help_equipment_summary'),
        steps: [
          t('help_equipment_step_1'),
          t('help_equipment_step_2'),
          t('help_equipment_step_3')
        ],
        permission: PermissionEntity.ASSETS,
        href: '/app/assets',
        icon: <BuildOutlinedIcon />,
        keywords: ['equipment', 'asset', 'history', 'location']
      },
      {
        id: 'inventory',
        title: t('help_inventory_title'),
        summary: t('help_inventory_summary'),
        steps: [
          t('help_inventory_step_1'),
          t('help_inventory_step_2'),
          t('help_inventory_step_3')
        ],
        permission: PermissionEntity.PARTS_AND_MULTIPARTS,
        href: '/app/inventory/parts',
        icon: <Inventory2OutlinedIcon />,
        keywords: ['parts', 'inventory', 'stock', 'store', 'quantity']
      },
      {
        id: 'planning',
        title: t('help_planning_title'),
        summary: t('help_planning_summary'),
        steps: [
          t('help_planning_step_1'),
          t('help_planning_step_2'),
          t('help_planning_step_3')
        ],
        permission: PermissionEntity.WORK_ORDERS,
        href: '/app/work-orders?view=calendar',
        icon: <TaskAltOutlinedIcon />,
        keywords: ['planning', 'calendar', 'schedule', 'work order']
      },
      {
        id: 'account',
        title: t('help_account_title'),
        summary: t('help_account_summary'),
        steps: [
          t('help_account_step_1'),
          t('help_account_step_2'),
          t('help_account_step_3')
        ],
        href: '/app/account/profile',
        icon: <PersonOutlineOutlinedIcon />,
        keywords: ['profile', 'preferences', 'language', 'account']
      },
      {
        id: 'settings',
        title: t('help_settings_title'),
        summary: t('help_settings_summary'),
        steps: [
          t('help_settings_step_1'),
          t('help_settings_step_2'),
          t('help_settings_step_3')
        ],
        permission: PermissionEntity.SETTINGS,
        href: '/app/settings',
        icon: <SettingsOutlinedIcon />,
        keywords: ['settings', 'administration', 'permissions', 'company']
      }
    ],
    [t]
  );

  const guides = useMemo<Guide[]>(
    () =>
      databaseArticles !== null
        ? databaseArticles.map((article) => {
            const permission = Object.values(PermissionEntity).find(
              (value) => value === article.requiredPermission
            );
            const resolvedContent = article.content.replace(
              /qpm-help-asset:([0-9a-f-]{36})/gi,
              (_match, assetId) => `${apiUrl}documentation/assets/${assetId}`
            );
            return {
              id: article.slug,
              title: article.title,
              summary: article.summary,
              steps: [getArticleContentText(article.content)],
              permission,
              icon: <MenuBookOutlinedIcon />,
              keywords: article.keywords ?? [],
              categoryTitle: article.categoryTitle,
              contentHtml: resolvedContent,
              updatedAt: article.updatedAt
            };
          })
        : localGuides,
    [databaseArticles, localGuides]
  );

  const visibleGuides = guides.filter(
    (guide) => !guide.permission || hasViewPermission(guide.permission)
  );
  const navigationGroups = visibleGuides.reduce<
    Array<{ key: string; title: string; guides: Guide[] }>
  >((groups, guide) => {
    const title = guide.categoryTitle ?? guide.title;
    const key = getCategoryKey(guide);
    const existing = groups.find((group) => group.key === key);
    if (existing) existing.guides.push(guide);
    else groups.push({ key, title, guides: [guide] });
    return groups;
  }, []);
  const activeGuide =
    visibleGuides.find((guide) => guide.id === slug) ??
    visibleGuides.find((guide) => guide.id === guideSlugAliases[slug ?? '']);
  const normalizedQuery = normalizeHelpSearch(query.trim());
  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  const filteredGuides = visibleGuides
    .filter(
      (guide) =>
        !searchCategory ||
        (guide.categoryTitle ?? guide.title) === searchCategory
    )
    .filter((guide) => {
      const searchable = normalizeHelpSearch(
        `${guide.title} ${guide.summary} ${guide.steps.join(' ')} ${
          guide.categoryTitle ?? ''
        } ${guide.keywords.join(' ')}`
      );
      return queryTerms.every((term) => searchable.includes(term));
    })
    .sort((first, second) => {
      const score = (guide: Guide) => {
        const title = normalizeHelpSearch(guide.title);
        const summary = normalizeHelpSearch(guide.summary);
        const keywords = normalizeHelpSearch(guide.keywords.join(' '));
        const titleMatches = queryTerms.filter((term) =>
          title.includes(term)
        ).length;
        const keywordMatches = queryTerms.filter((term) =>
          keywords.includes(term)
        ).length;
        const summaryMatches = queryTerms.filter((term) =>
          summary.includes(term)
        ).length;
        return titleMatches * 3 + keywordMatches * 2 + summaryMatches;
      };
      return score(second) - score(first);
    });
  const suggestions = query.trim() ? filteredGuides.slice(0, 6) : [];
  useEffect(() => {
    let mounted = true;
    let objectUrls: string[] = [];
    setHydratedArticle(null);
    if (!activeGuide?.contentHtml) return () => undefined;

    hydrateAuthorizedImages(activeGuide.contentHtml)
      .then((result) => {
        objectUrls = result.objectUrls;
        if (mounted)
          setHydratedArticle({ slug: activeGuide.id, html: result.html });
        else objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
      objectUrls.forEach((objectUrl) => URL.revokeObjectURL(objectUrl));
    };
  }, [activeGuide?.id, activeGuide?.contentHtml]);
  const articleWords = activeGuide
    ? `${activeGuide.title} ${activeGuide.summary} ${activeGuide.steps.join(
        ' '
      )}`.split(/\s+/).length
    : 0;
  const readingTime = Math.max(1, Math.ceil(articleWords / 180));
  const preparedArticle = useMemo(() => {
    if (!activeGuide?.contentHtml) return null;
    const parsed = new DOMParser().parseFromString(
      hydratedArticle?.slug === activeGuide.id
        ? hydratedArticle.html
        : activeGuide.contentHtml,
      'text/html'
    );
    const headings = Array.from(parsed.body.querySelectorAll('h1, h2, h3, h4'));
    parsed.body.querySelectorAll('img').forEach((image) => {
      if (!image.hasAttribute('alt')) image.alt = activeGuide.title;
      image.loading = 'lazy';
      image.decoding = 'async';
      if (image.alt.trim()) {
        image.tabIndex = 0;
        image.setAttribute('role', 'button');
        image.setAttribute('aria-haspopup', 'dialog');
        image.setAttribute('aria-label', image.alt);
      }
      if (hydratedArticle?.slug !== activeGuide.id)
        image.removeAttribute('src');
    });
    const headingSections = headings.map((heading, index) => {
      const id = `content-section-${index + 1}`;
      heading.id = id;
      return {
        id,
        title: heading.textContent?.trim() || t('help_article_section')
      };
    });
    return { html: parsed.body.innerHTML, headingSections };
  }, [activeGuide, hydratedArticle, t]);
  const sections = useMemo(
    () =>
      activeGuide
        ? [
            { id: 'overview', title: t('help_article_overview') },
            { id: 'steps', title: t('help_article_steps') },
            ...(preparedArticle?.headingSections ??
              activeGuide.steps.map((_step, index) => ({
                id: `step-${index + 1}`,
                title: `${t('help_step')} ${index + 1}`
              }))),
            { id: 'related', title: t('help_related_articles') }
          ]
        : [],
    [activeGuide, preparedArticle, t]
  );

  useEffect(() => {
    if (slug && activeGuide) {
      setOpenCategories((current) => ({
        ...current,
        [getCategoryKey(activeGuide)]: true
      }));
      setActiveSection('overview');
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [slug, activeGuide]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        navStorageKey,
        JSON.stringify(openCategories)
      );
    } catch (_error) {
      // Navigation remains usable when browser storage is unavailable.
    }
  }, [openCategories]);

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if (
        !activeGuide &&
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [activeGuide]);

  useEffect(() => {
    if (!activeGuide || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-18% 0px -68% 0px' }
    );
    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [activeGuide, sections]);

  const goToGuide = (id: string) => {
    setQuery('');
    setActiveSuggestion(0);
    navigate(`${helpRoot}/${id}`);
    setMobileNavOpen(false);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault();
      setActiveSuggestion((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault();
      setActiveSuggestion(
        (index) => (index - 1 + suggestions.length) % suggestions.length
      );
    } else if (event.key === 'Enter' && suggestions[activeSuggestion]) {
      event.preventDefault();
      goToGuide(suggestions[activeSuggestion].id);
    } else if (event.key === 'Escape') {
      setQuery('');
      event.currentTarget.blur();
    }
  };

  const searchField = (compact = false, searchId = 'help-home-search') => (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <Paper
        variant="outlined"
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: compact ? 1.25 : 1.75,
          py: compact ? 0.5 : 1,
          borderRadius: 2,
          boxShadow: 'none',
          borderColor: query ? 'primary.main' : 'divider',
          '&:focus-within': { borderColor: 'primary.main' }
        }}
      >
        <InputAdornment position="start">
          <SearchOutlinedIcon color={query ? 'primary' : 'action'} />
        </InputAdornment>
        <InputBase
          inputRef={compact ? undefined : searchRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveSuggestion(0);
          }}
          onKeyDown={handleSearchKeyDown}
          placeholder={t('help_search_placeholder')}
          inputProps={{
            'aria-label': t('help_search_placeholder'),
            role: 'combobox',
            'aria-expanded': Boolean(query.trim()),
            'aria-controls': `${searchId}-results`,
            'aria-activedescendant': suggestions[activeSuggestion]
              ? `${searchId}-result-${suggestions[activeSuggestion].id}`
              : undefined,
            'aria-autocomplete': 'list'
          }}
          fullWidth
          sx={{ py: 0.5, fontSize: compact ? '0.9rem' : '1rem' }}
        />
        {query && (
          <IconButton
            size="small"
            aria-label={t('help_clear_search')}
            onClick={() => {
              setQuery('');
              setSearchCategory('');
            }}
          >
            <CloseOutlinedIcon fontSize="small" />
          </IconButton>
        )}
        {!compact && (
          <Chip
            size="small"
            label="Ctrl / ⌘ K"
            variant="outlined"
            sx={{
              display: { xs: 'none', sm: 'flex' },
              ml: 1,
              color: 'text.secondary'
            }}
          />
        )}
      </Paper>
      {query.trim() && (
        <Box
          role="status"
          aria-live="polite"
          sx={{
            position: 'absolute',
            width: 1,
            height: 1,
            p: 0,
            m: -1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0
          }}
        >
          {t(
            filteredGuides.length === 1
              ? 'help_results_count_singular'
              : 'help_results_count_plural',
            { count: filteredGuides.length }
          )}
        </Box>
      )}
      {query.trim() && (
        <Box
          sx={{
            position: 'absolute',
            zIndex: theme.zIndex.modal + 1,
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0
          }}
        >
          <Paper
            elevation={4}
            sx={{ p: 1, mb: 0.75, border: 1, borderColor: 'divider' }}
          >
            <FormControl fullWidth size="small">
              <InputLabel id={`${searchId}-category-label`}>
                {t('help_filter_category')}
              </InputLabel>
              <Select
                labelId={`${searchId}-category-label`}
                value={searchCategory}
                label={t('help_filter_category')}
                onChange={(event) => {
                  setSearchCategory(event.target.value);
                  setActiveSuggestion(0);
                }}
              >
                <MenuItem value="">{t('help_all_categories')}</MenuItem>
                {navigationGroups.map((category) => (
                  <MenuItem key={category.key} value={category.title}>
                    {category.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
          <Paper
            id={`${searchId}-results`}
            role="listbox"
            elevation={4}
            sx={{
              maxHeight: 320,
              overflowY: 'auto',
              p: 0.75,
              border: 1,
              borderColor: 'divider'
            }}
          >
            {suggestions.length ? (
              suggestions.map((guide, index) => (
                <ListItemButton
                  key={guide.id}
                  id={`${searchId}-result-${guide.id}`}
                  role="option"
                  aria-selected={activeSuggestion === index}
                  onMouseEnter={() => setActiveSuggestion(index)}
                  onClick={() => goToGuide(guide.id)}
                  sx={{
                    borderRadius: 1.5,
                    gap: 1.25,
                    alignItems: 'flex-start'
                  }}
                >
                  <Box sx={{ color: 'primary.main', mt: 0.25 }}>
                    {guide.icon}
                  </Box>
                  <ListItemText
                    primary={<Highlight text={guide.title} query={query} />}
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="caption"
                          color="primary.main"
                          sx={{ display: 'block', mb: 0.25 }}
                        >
                          {guide.categoryTitle ?? t('help_category_label')}
                        </Typography>
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block' }}
                        >
                          <Highlight text={guide.summary} query={query} />
                        </Typography>
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mt: 0.25 }}
                        >
                          <Highlight
                            text={getSearchExcerpt(
                              guide.steps.join(' '),
                              query
                            )}
                            query={query}
                          />
                        </Typography>
                      </>
                    }
                    primaryTypographyProps={{
                      fontWeight: 600,
                      variant: 'body2'
                    }}
                  />
                  <ArrowForwardOutlinedIcon fontSize="small" color="action" />
                </ListItemButton>
              ))
            ) : (
              <Typography role="status" color="text.secondary" sx={{ p: 2 }}>
                {t('help_no_results')}
              </Typography>
            )}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ px: 1.5, py: 0.75, display: 'block' }}
            >
              {t('help_search_keyboard_hint')}
            </Typography>
          </Paper>
        </Box>
      )}
    </Box>
  );

  const renderNavigation = (drawer = false) => (
    <Box
      component="nav"
      aria-label={t('help_documentation')}
      sx={{
        width: drawer ? { xs: 300, sm: 340 } : '100%',
        height: drawer ? '100%' : { md: 'calc(100vh - 140px)' },
        overflowY: 'auto',
        px: drawer ? 2 : 0,
        py: drawer ? 2 : 0,
        position: drawer ? 'static' : { md: 'sticky' },
        top: 96
      }}
    >
      {drawer && (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Typography fontWeight={700}>{t('help_documentation')}</Typography>
          <IconButton
            aria-label={t('help_close_navigation')}
            onClick={() => setMobileNavOpen(false)}
          >
            <CloseOutlinedIcon />
          </IconButton>
        </Stack>
      )}
      {searchField(true, drawer ? 'help-drawer-search' : 'help-sidebar-search')}
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ display: 'block', mt: 3, mb: 1, px: 1 }}
      >
        {t('help_documentation')}
      </Typography>
      <List disablePadding>
        {navigationGroups.map((group) => {
          const selected = group.guides.some(
            (guide) => activeGuide?.id === guide.id
          );
          const expanded = openCategories[group.key] ?? selected;
          return (
            <Box key={group.key} sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={selected}
                onClick={() => {
                  setOpenCategories((current) => ({
                    ...current,
                    [group.key]: !expanded
                  }));
                }}
                sx={{
                  borderRadius: 1.5,
                  py: 0.8,
                  '&.Mui-selected': {
                    color: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.09),
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.13)
                    }
                  }
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    mr: 1.25,
                    color: selected ? 'primary.main' : 'text.secondary'
                  }}
                >
                  {group.guides[0].icon}
                </Box>
                <ListItemText
                  primary={group.title}
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontWeight: selected ? 700 : 500
                  }}
                />
                <ChevronRightOutlinedIcon
                  fontSize="small"
                  sx={{
                    color: 'text.disabled',
                    transform: expanded ? 'rotate(90deg)' : 'none',
                    transition: 'transform 150ms ease'
                  }}
                />
              </ListItemButton>
              {expanded && (
                <List
                  disablePadding
                  sx={{
                    ml: 2.25,
                    pl: 1.25,
                    borderLeft: 1,
                    borderColor: 'divider'
                  }}
                >
                  {group.guides.map((guide) => (
                    <ListItemButton
                      key={guide.id}
                      component={RouterLink}
                      to={`${helpRoot}/${guide.id}`}
                      selected={activeGuide?.id === guide.id}
                      onClick={() => setMobileNavOpen(false)}
                      sx={{
                        minHeight: 34,
                        borderRadius: 1,
                        py: 0.25,
                        '&.Mui-selected': { color: 'primary.main' }
                      }}
                    >
                      <ListItemText
                        primary={guide.title}
                        primaryTypographyProps={{
                          variant: 'caption',
                          fontWeight: activeGuide?.id === guide.id ? 700 : 400
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Box>
          );
        })}
      </List>
    </Box>
  );

  const relatedGuides = activeGuide
    ? visibleGuides
        .filter((guide) => guide.id !== activeGuide.id)
        .sort((a, b) => {
          const aShared = a.keywords.filter((word) =>
            activeGuide.keywords.includes(word)
          ).length;
          const bShared = b.keywords.filter((word) =>
            activeGuide.keywords.includes(word)
          ).length;
          return bShared - aShared;
        })
        .slice(0, 3)
    : [];
  const categoryGroups = visibleGuides.reduce<
    Array<{ title: string; guides: Guide[] }>
  >((groups, guide) => {
    const title = guide.categoryTitle ?? guide.title;
    const existing = groups.find((group) => group.title === title);
    if (existing) existing.guides.push(guide);
    else groups.push({ title, guides: [guide] });
    return groups;
  }, []);

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3.5 } }}>
      <Helmet>
        <title>{`${name} — ${
          activeGuide?.title ?? t('help_center_title')
        }`}</title>
        <meta
          name="description"
          content={activeGuide?.summary ?? t('help_center_intro')}
        />
      </Helmet>

      {articlesStatus === 'loading' && (
        <LinearProgress
          aria-label={t('loading')}
          sx={{ mb: 2, maxWidth: 1120, mx: 'auto' }}
        />
      )}
      {articlesStatus === 'error' && (
        <Alert
          severity="warning"
          sx={{ mb: 2, maxWidth: 1120, mx: 'auto' }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => setArticlesReload((value) => value + 1)}
            >
              {t('retry')}
            </Button>
          }
        >
          {t('help_articles_load_error')}
        </Alert>
      )}
      {!activeGuide && slug && articlesStatus !== 'loading' ? (
        <Box sx={{ maxWidth: 760, mx: 'auto', pt: { xs: 2, md: 5 } }}>
          <Alert
            severity="info"
            action={
              <Button
                color="inherit"
                size="small"
                component={RouterLink}
                to={helpRoot}
              >
                {t('help_back_to_center')}
              </Button>
            }
          >
            {t('help_article_unavailable')}
          </Alert>
        </Box>
      ) : !activeGuide && slug ? null : !activeGuide ? (
        <Box sx={{ maxWidth: 1120, mx: 'auto' }}>
          <Stack spacing={5}>
            <Box
              sx={{
                maxWidth: 760,
                mx: 'auto',
                textAlign: 'center',
                width: '100%',
                pt: { xs: 2, md: 5 }
              }}
            >
              <Chip
                icon={<MenuBookOutlinedIcon />}
                label={t('help_documentation')}
                color="primary"
                variant="outlined"
                sx={{ mb: 2 }}
              />
              <Typography
                variant="h1"
                component="h1"
                sx={{
                  fontSize: { xs: '2rem', sm: '2.7rem' },
                  letterSpacing: '-0.035em',
                  mb: 1.25
                }}
              >
                {t('help_center_title')}
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ fontSize: { xs: '1rem', md: '1.1rem' }, mb: 3 }}
              >
                {t('help_center_landing_subtitle')}
              </Typography>
              {searchField()}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: 'block' }}
              >
                {t('help_guides_available', { count: visibleGuides.length })}
              </Typography>
            </Box>

            <Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="end"
                sx={{ mb: 1.5 }}
              >
                <Box>
                  <Typography variant="h5" component="h2" fontWeight={700}>
                    {t('help_browse_by_topic')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('help_topics_intro')}
                  </Typography>
                </Box>
              </Stack>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    lg: 'repeat(3, 1fr)'
                  },
                  gap: 1.5
                }}
              >
                {categoryGroups.map((category) => (
                  <Card
                    key={category.title}
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      transition:
                        'border-color 150ms ease, background-color 150ms ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: alpha(theme.palette.primary.main, 0.025)
                      }
                    }}
                  >
                    <CardActionArea
                      onClick={() => goToGuide(category.guides[0].id)}
                      sx={{ height: '100%', p: 2 }}
                    >
                      <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="flex-start"
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            color: 'primary.main',
                            p: 1,
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            borderRadius: 1.5
                          }}
                        >
                          {category.guides[0].icon}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={700}>
                            {category.title}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mt: 0.5 }}
                          >
                            {category.guides[0].summary}
                          </Typography>
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{ mt: 1.25 }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {t(
                                category.guides.length === 1
                                  ? 'help_article_count_singular'
                                  : 'help_article_count_plural',
                                { count: category.guides.length }
                              )}
                            </Typography>
                            <ArrowForwardOutlinedIcon
                              fontSize="small"
                              color="action"
                            />
                          </Stack>
                        </Box>
                      </Stack>
                    </CardActionArea>
                  </Card>
                ))}
              </Box>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.8fr' },
                gap: 4
              }}
            >
              <Box>
                <Typography
                  variant="h5"
                  component="h2"
                  fontWeight={700}
                  sx={{ mb: 1.5 }}
                >
                  {t('help_popular_guides')}
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{ borderRadius: 2, overflow: 'hidden' }}
                >
                  {visibleGuides.slice(0, 5).map((guide, index) => (
                    <Box key={guide.id}>
                      {index > 0 && <Divider />}
                      <ListItemButton
                        onClick={() => goToGuide(guide.id)}
                        sx={{ py: 1.2, px: 2 }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            color: 'primary.main',
                            mr: 1.5
                          }}
                        >
                          {guide.icon}
                        </Box>
                        <ListItemText
                          primary={guide.title}
                          secondary={guide.summary}
                          primaryTypographyProps={{
                            fontWeight: 600,
                            variant: 'body2'
                          }}
                          secondaryTypographyProps={{
                            noWrap: true,
                            variant: 'caption'
                          }}
                        />
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ whiteSpace: 'nowrap', ml: 1 }}
                        >
                          {Math.max(
                            1,
                            Math.ceil(
                              `${guide.summary} ${guide.steps.join(' ')}`.split(
                                /\s+/
                              ).length / 180
                            )
                          )}{' '}
                          {t('help_min_read')}
                        </Typography>
                      </ListItemButton>
                    </Box>
                  ))}
                </Paper>
              </Box>
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  p: { xs: 2, md: 2.5 },
                  bgcolor: alpha(theme.palette.primary.main, 0.025),
                  alignSelf: 'start'
                }}
              >
                <Stack
                  direction="row"
                  spacing={1.25}
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Box sx={{ display: 'flex', color: 'primary.main' }}>
                    <HelpOutlineOutlinedIcon />
                  </Box>
                  <Typography variant="h6" fontWeight={700}>
                    {t('help_getting_started')}
                  </Typography>
                </Stack>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1.5 }}
                >
                  {t('help_getting_started_intro')}
                </Typography>
                <Stack spacing={0.5}>
                  {visibleGuides
                    .filter((guide) =>
                      ['account', 'work-orders', 'requests'].includes(guide.id)
                    )
                    .map((guide) => (
                      <Button
                        key={guide.id}
                        component={RouterLink}
                        to={`${helpRoot}/${guide.id}`}
                        endIcon={<ArrowForwardOutlinedIcon />}
                        sx={{
                          justifyContent: 'space-between',
                          px: 0,
                          textAlign: 'left'
                        }}
                      >
                        {guide.title}
                      </Button>
                    ))}
                </Stack>
              </Paper>
            </Box>
            {!visibleGuides.length && (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  {t('help_no_visible_guides')}
                </Typography>
              </Paper>
            )}
          </Stack>
        </Box>
      ) : (
        <>
          <Breadcrumbs
            aria-label={t('help_breadcrumb')}
            sx={{ mb: 2.5, display: { xs: 'none', sm: 'flex' } }}
          >
            <Link
              component={RouterLink}
              underline="hover"
              color="inherit"
              to={helpRoot}
            >
              {t('help_documentation')}
            </Link>
            <Typography color="text.primary" variant="body2">
              {activeGuide.title}
            </Typography>
          </Breadcrumbs>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: '220px minmax(0, 1fr)',
                lg: '240px minmax(0, 720px) 190px'
              },
              gap: { xs: 0, md: 3, lg: 4 },
              alignItems: 'start'
            }}
          >
            {isTablet ? (
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                {renderNavigation()}
              </Box>
            ) : null}
            <Box
              component="main"
              sx={{
                minWidth: 0,
                mx: { xs: 0, md: 'auto' },
                width: '100%',
                maxWidth: { md: 780 }
              }}
            >
              {!isTablet && (
                <Button
                  startIcon={<MenuOutlinedIcon />}
                  onClick={() => setMobileNavOpen(true)}
                  sx={{ mb: 2 }}
                >
                  {t('help_documentation')}
                </Button>
              )}
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 1, color: 'primary.main' }}
              >
                <Box sx={{ display: 'flex' }}>{activeGuide.icon}</Box>
                <Typography variant="overline" color="primary.main">
                  {activeGuide.categoryTitle ?? activeGuide.title}
                </Typography>
              </Stack>
              <Typography
                variant="h1"
                component="h1"
                sx={{
                  fontSize: { xs: '1.8rem', sm: '2.35rem' },
                  letterSpacing: '-0.03em',
                  mb: 1.25
                }}
              >
                {activeGuide.title}
              </Typography>
              <Typography
                color="text.secondary"
                sx={{ fontSize: '1.05rem', mb: 2 }}
              >
                {activeGuide.summary}
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 3, flexWrap: 'wrap' }}
              >
                <Typography variant="caption" color="text.secondary">
                  {t('help_updated_date', {
                    date: new Date(
                      activeGuide.updatedAt ?? Date.now()
                    ).toLocaleDateString()
                  })}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  ·
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {readingTime} {t('help_min_read')}
                </Typography>
              </Stack>
              <Divider sx={{ mb: 3 }} />

              <Stack spacing={3} sx={{ '& section': { scrollMarginTop: 96 } }}>
                <Box component="section" id="overview">
                  <Typography
                    variant="h5"
                    component="h2"
                    fontWeight={700}
                    sx={{ mb: 1 }}
                  >
                    {t('help_article_overview')}
                  </Typography>
                  <Typography color="text.secondary">
                    {activeGuide.summary}
                  </Typography>
                </Box>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.info.main, 0.035)
                  }}
                >
                  <Typography variant="body2">
                    {t('help_permissions_note')}
                  </Typography>
                </Paper>
                <Box component="section" id="steps">
                  <Typography
                    variant="h5"
                    component="h2"
                    fontWeight={700}
                    sx={{ mb: 2 }}
                  >
                    {t('help_article_steps')}
                  </Typography>
                  {preparedArticle ? (
                    <Box
                      className="help-article-content"
                      dangerouslySetInnerHTML={{ __html: preparedArticle.html }}
                      onClick={(event) => {
                        if (event.target instanceof HTMLImageElement) {
                          const image = event.target;
                          if (image.alt.trim())
                            setExpandedImage({
                              src: image.currentSrc || image.src,
                              alt: image.alt
                            });
                        }
                      }}
                      onKeyDown={(event) => {
                        if (
                          event.target instanceof HTMLImageElement &&
                          event.target.alt.trim() &&
                          (event.key === 'Enter' || event.key === ' ')
                        ) {
                          event.preventDefault();
                          const image = event.target;
                          setExpandedImage({
                            src: image.currentSrc || image.src,
                            alt: image.alt
                          });
                        }
                      }}
                      sx={{
                        color: 'text.secondary',
                        lineHeight: 1.8,
                        '& h1, & h2, & h3, & h4': {
                          color: 'text.primary',
                          lineHeight: 1.35,
                          mt: 3,
                          mb: 1.25,
                          scrollMarginTop: 96
                        },
                        '& p, & ul, & ol, & blockquote, & pre, & table': {
                          my: 1.5
                        },
                        '& img': {
                          display: 'block',
                          maxWidth: '100%',
                          height: 'auto',
                          borderRadius: 1.5,
                          cursor: 'zoom-in'
                        },
                        '& table': {
                          width: '100%',
                          borderCollapse: 'collapse',
                          display: 'block',
                          overflowX: 'auto'
                        },
                        '& th, & td': {
                          border: 1,
                          borderColor: 'divider',
                          p: 1,
                          textAlign: 'left'
                        },
                        '& blockquote': {
                          borderLeft: 3,
                          borderColor: 'primary.main',
                          pl: 2,
                          ml: 0,
                          color: 'text.secondary'
                        },
                        '& pre': {
                          overflowX: 'auto',
                          p: 1.5,
                          borderRadius: 1,
                          bgcolor: 'action.hover'
                        }
                      }}
                    />
                  ) : (
                    <Box
                      component="ol"
                      sx={{
                        listStyle: 'none',
                        m: 0,
                        p: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2.5
                      }}
                    >
                      {activeGuide.steps.map((step, index) => (
                        <Box
                          component="li"
                          key={`${activeGuide.id}-step-${index}`}
                        >
                          <Box component="section" id={`step-${index + 1}`}>
                            <Stack
                              direction="row"
                              spacing={1.5}
                              alignItems="flex-start"
                            >
                              <Box
                                sx={{
                                  width: 28,
                                  height: 28,
                                  flexShrink: 0,
                                  borderRadius: '50%',
                                  bgcolor: alpha(
                                    theme.palette.primary.main,
                                    0.1
                                  ),
                                  color: 'primary.main',
                                  display: 'grid',
                                  placeItems: 'center',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  mt: 0.25
                                }}
                              >
                                {index + 1}
                              </Box>
                              <Box>
                                <Typography
                                  variant="subtitle1"
                                  component="h3"
                                  fontWeight={700}
                                  sx={{ mb: 0.5 }}
                                >
                                  {t('help_step')} {index + 1}
                                </Typography>
                                <Typography
                                  color="text.secondary"
                                  sx={{ lineHeight: 1.75 }}
                                >
                                  {step}
                                </Typography>
                              </Box>
                            </Stack>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
                <Box component="section" id="related">
                  <Typography
                    variant="h5"
                    component="h2"
                    fontWeight={700}
                    sx={{ mb: 1.5 }}
                  >
                    {t('help_related_articles')}
                  </Typography>
                  <Stack spacing={0.5}>
                    {relatedGuides.map((guide) => (
                      <Button
                        key={guide.id}
                        component={RouterLink}
                        to={`${helpRoot}/${guide.id}`}
                        startIcon={guide.icon}
                        endIcon={<ArrowForwardOutlinedIcon />}
                        sx={{
                          justifyContent: 'space-between',
                          px: 0,
                          textTransform: 'none'
                        }}
                      >
                        {guide.title}
                      </Button>
                    ))}
                  </Stack>
                </Box>
                {activeGuide.href && (
                  <Box sx={{ pt: 1 }}>
                    <Button
                      component={RouterLink}
                      to={activeGuide.href}
                      variant="contained"
                      endIcon={<ArrowForwardOutlinedIcon />}
                    >
                      {t('help_open_module')}
                    </Button>
                  </Box>
                )}
                <Divider />
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Button
                    component={RouterLink}
                    to={helpRoot}
                    startIcon={<ArrowBackOutlinedIcon />}
                  >
                    {t('help_back_to_home')}
                  </Button>
                </Stack>
              </Stack>
            </Box>
            {isDesktop && (
              <Box
                component="aside"
                aria-label={t('help_on_this_page')}
                sx={{
                  position: 'sticky',
                  top: 104,
                  maxHeight: 'calc(100vh - 130px)',
                  overflowY: 'auto'
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  sx={{ mb: 1.25 }}
                >
                  {t('help_on_this_page')}
                </Typography>
                <List
                  disablePadding
                  sx={{ borderLeft: 1, borderColor: 'divider' }}
                >
                  {sections.map((section) => (
                    <ListItemButton
                      key={section.id}
                      component="a"
                      href={`#${section.id}`}
                      selected={activeSection === section.id}
                      sx={{
                        py: 0.65,
                        px: 1.25,
                        minHeight: 30,
                        borderRadius: 0,
                        borderLeft: 2,
                        borderColor:
                          activeSection === section.id
                            ? 'primary.main'
                            : 'transparent',
                        ml: '-1px',
                        '&.Mui-selected': {
                          bgcolor: 'transparent',
                          color: 'primary.main'
                        },
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <ListItemText
                        primary={section.title}
                        primaryTypographyProps={{
                          variant: 'caption',
                          fontWeight: activeSection === section.id ? 700 : 400
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Box>
            )}
          </Box>
          <Drawer
            anchor="left"
            open={mobileNavOpen}
            onClose={() => setMobileNavOpen(false)}
            PaperProps={{ sx: { width: { xs: 300, sm: 340 }, pt: 1 } }}
          >
            {renderNavigation(true)}
          </Drawer>
          <Dialog fullScreen={isCompactDialog}
            open={Boolean(expandedImage)}
            onClose={() => setExpandedImage(null)}
            maxWidth="lg"
            fullWidth
          >
            <DialogTitle>{activeGuide.title}</DialogTitle>
            <DialogContent sx={{ display: 'grid', placeItems: 'center', p: 1 }}>
              {expandedImage && (
                <img
                  src={expandedImage.src}
                  alt={expandedImage.alt}
                  style={{
                    display: 'block',
                    maxWidth: '100%',
                    maxHeight: '80vh',
                    objectFit: 'contain'
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </Container>
  );
}
