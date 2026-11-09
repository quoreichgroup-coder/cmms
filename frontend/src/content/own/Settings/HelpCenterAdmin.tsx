import {
  ChangeEvent,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import PreviewOutlinedIcon from '@mui/icons-material/PreviewOutlined';
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import { useTranslation } from 'react-i18next';
import { TitleContext } from '../../../contexts/TitleContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { CustomSnackBarContext } from '../../../contexts/CustomSnackBarContext';
import { PermissionEntity } from '../../../models/owns/role';
import {
  DocumentationArticle,
  DocumentationArticleRequest,
  DocumentationAsset,
  DocumentationCategory,
  DocumentationCategoryRequest
} from '../../../models/owns/documentation';
import api, { authHeader, getErrorMessage } from '../../../utils/api';
import { apiUrl } from '../../../config';
import {
  hydrateAuthorizedImages,
  storeAuthorizedImages
} from '../HelpCenter/authorizedImages';

const apiImageUrl = (assetId: string) =>
  `${apiUrl}documentation/assets/${assetId}`;

const toEditorHtml = (content: string) =>
  content.replace(/qpm-help-asset:([0-9a-f-]{36})/gi, (_match, id) =>
    apiImageUrl(id)
  );

const statusColor = (status: DocumentationArticle['status']) =>
  status === 'PUBLISHED'
    ? 'success'
    : status === 'ARCHIVED'
    ? 'default'
    : 'warning';

const emptyCategory: DocumentationCategoryRequest = {
  locale: 'en',
  title: '',
  slug: '',
  description: '',
  icon: '',
  displayOrder: 0,
  requiredPermission: '',
  active: true
};

const emptyArticle: DocumentationArticleRequest = {
  locale: 'en',
  categoryId: 0,
  title: '',
  slug: '',
  summary: '',
  content: '',
  keywords: [],
  displayOrder: 0,
  requiredPermission: ''
};

export default function HelpCenterAdmin() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage?.toLowerCase().startsWith('fr')
    ? 'fr'
    : 'en';
  const { setTitle } = useContext(TitleContext);
  const { showSnackBar } = useContext(CustomSnackBarContext);
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [categories, setCategories] = useState<DocumentationCategory[]>([]);
  const [articles, setArticles] = useState<DocumentationArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState(
    'help_admin_load_error'
  );
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] =
    useState<DocumentationCategoryRequest>(emptyCategory);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
    null
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [articleDraft, setArticleDraft] =
    useState<DocumentationArticleRequest>(emptyArticle);
  const [editingArticle, setEditingArticle] =
    useState<DocumentationArticle | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [articleBaseline, setArticleBaseline] = useState<string | null>(null);
  const [openDiscardDialog, setOpenDiscardDialog] = useState(false);
  const [pendingArchive, setPendingArchive] = useState<
    | { kind: 'article'; article: DocumentationArticle }
    | { kind: 'category'; category: DocumentationCategory }
    | null
  >(null);
  const [articleFilter, setArticleFilter] = useState('ALL');
  const [imageAltDialogOpen, setImageAltDialogOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<{
    objectUrl: string;
    isNew: boolean;
  } | null>(null);
  const [imageAltText, setImageAltText] = useState('');
  const [imageDecorative, setImageDecorative] = useState(false);
  const quillRef = useRef<ReactQuill>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageObjectUrlsRef = useRef<Record<string, string>>({});
  const [imageObjectUrls, setImageObjectUrls] = useState<
    Record<string, string>
  >({});

  useEffect(
    () => () =>
      Object.values(imageObjectUrlsRef.current).forEach(URL.revokeObjectURL),
    []
  );

  const rememberImageUrls = (assetUrls: Record<string, string>) => {
    const next = { ...imageObjectUrlsRef.current };
    Object.entries(assetUrls).forEach(([assetId, objectUrl]) => {
      const previous = next[assetId];
      if (previous && previous !== objectUrl) URL.revokeObjectURL(previous);
      next[assetId] = objectUrl;
    });
    imageObjectUrlsRef.current = next;
    setImageObjectUrls(next);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    setLoadErrorMessage('help_admin_load_error');
    try {
      const [nextCategories, nextArticles] = await Promise.all([
        api.get<DocumentationCategory[]>(
          `documentation/admin/categories?locale=${locale}`
        ),
        api.get<DocumentationArticle[]>(
          `documentation/admin/articles?locale=${locale}`
        )
      ]);
      setCategories(nextCategories);
      setArticles(nextArticles);
    } catch (error) {
      setLoadError(true);
      setLoadErrorMessage(getErrorMessage(error, 'help_admin_load_error'));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    setTitle(t('help_center_management'));
  }, [setTitle, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const permissions = useMemo(() => Object.values(PermissionEntity), []);
  const filteredArticles = articles.filter(
    (article) => articleFilter === 'ALL' || article.status === articleFilter
  );
  const quillModules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [2, 3, false] }],
          ['bold', 'italic', 'underline'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['link', 'image'],
          ['clean']
        ],
        handlers: {
          image: function imageHandler(this: { quill: any }) {
            this.quill.focus();
            imageInputRef.current?.click();
          }
        }
      }
    }),
    []
  );

  const openNewArticle = () => {
    setEditingArticle(null);
    setArticleDraft({
      ...emptyArticle,
      locale,
      categoryId: categories[0]?.id ?? 0
    });
    setEditorOpen(true);
  };

  const openArticle = async (article: DocumentationArticle) => {
    try {
      const hydrated = await hydrateAuthorizedImages(
        toEditorHtml(article.content)
      );
      rememberImageUrls(hydrated.assetUrls);
      setEditingArticle(article);
      setArticleDraft({
        locale: article.locale,
        categoryId: article.categoryId,
        title: article.title,
        slug: article.slug,
        summary: article.summary,
        content: hydrated.html,
        keywords: article.keywords,
        displayOrder: article.displayOrder,
        requiredPermission: article.requiredPermission ?? ''
      });
      setEditorOpen(true);
    } catch (error) {
      showSnackBar(getErrorMessage(error, t('help_save_failed')), 'error');
    }
  };

  const openNewCategory = () => {
    setEditingCategoryId(null);
    setCategoryDraft({ ...emptyCategory, locale });
    setCategoryOpen(true);
  };

  const openCategory = (category: DocumentationCategory) => {
    setEditingCategoryId(category.id);
    setCategoryDraft({
      locale: category.locale,
      title: category.title,
      slug: category.slug,
      description: category.description ?? '',
      icon: category.icon ?? '',
      displayOrder: category.displayOrder,
      requiredPermission: category.requiredPermission ?? '',
      active: category.active
    });
    setCategoryOpen(true);
  };

  const saveCategory = async () => {
    if (!categoryDraft.title.trim()) return;
    setSaving(true);
    try {
      const payload = { ...categoryDraft, locale };
      if (editingCategoryId) {
        await api.put(
          `documentation/admin/categories/${editingCategoryId}`,
          payload
        );
      } else {
        await api.post('documentation/admin/categories', payload);
      }
      setCategoryOpen(false);
      await refresh();
      showSnackBar(t('help_category_saved'), 'success');
    } catch (error) {
      showSnackBar(getErrorMessage(error, t('help_save_failed')), 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveArticle = async () => {
    const payload: DocumentationArticleRequest = {
      ...articleDraft,
      locale,
      content: storeAuthorizedImages(articleDraft.content, imageObjectUrls),
      keywords: articleDraft.keywords
        .flatMap((keyword) => keyword.split(','))
        .map((keyword) => keyword.trim())
        .filter(Boolean)
    };
    if (
      !payload.categoryId ||
      !payload.title.trim() ||
      !payload.summary.trim() ||
      !payload.content.trim()
    ) {
      showSnackBar(t('help_article_required_fields'), 'error');
      return;
    }
    setSaving(true);
    try {
      if (editingArticle) {
        await api.put(
          `documentation/admin/articles/${editingArticle.id}`,
          payload
        );
      } else {
        await api.post('documentation/admin/articles', payload);
      }
      setEditorOpen(false);
      await refresh();
      showSnackBar(t('help_article_saved'), 'success');
    } catch (error) {
      showSnackBar(getErrorMessage(error, t('help_save_failed')), 'error');
    } finally {
      setSaving(false);
    }
  };

  const publishArticle = async (article: DocumentationArticle) => {
    setSaving(true);
    try {
      await api.post(`documentation/admin/articles/${article.id}/publish`, {});
      await refresh();
      showSnackBar(t('help_article_published'), 'success');
    } catch (error) {
      showSnackBar(getErrorMessage(error, t('help_publish_failed')), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Snapshot the draft when the editor opens so closing it can warn about unsaved edits.
  useEffect(() => {
    setArticleBaseline(editorOpen ? JSON.stringify(articleDraft) : null);
  }, [editorOpen]);
  const isArticleDirty =
    editorOpen &&
    articleBaseline !== null &&
    JSON.stringify(articleDraft) !== articleBaseline;
  const requestCloseEditor = () => {
    if (isArticleDirty) setOpenDiscardDialog(true);
    else setEditorOpen(false);
  };

  const archiveArticle = async (article: DocumentationArticle) => {
    setSaving(true);
    try {
      await api.post(`documentation/admin/articles/${article.id}/archive`, {});
      await refresh();
      showSnackBar(t('help_article_archived'), 'success');
    } catch (error) {
      showSnackBar(getErrorMessage(error, t('help_save_failed')), 'error');
    } finally {
      setSaving(false);
    }
  };

  const restoreArticle = async (article: DocumentationArticle) => {
    setSaving(true);
    try {
      await api.post(`documentation/admin/articles/${article.id}/restore`, {});
      await refresh();
      showSnackBar(t('help_article_restored'), 'success');
    } catch (error) {
      showSnackBar(getErrorMessage(error, t('help_save_failed')), 'error');
    } finally {
      setSaving(false);
    }
  };

  const archiveCategory = async (category: DocumentationCategory) => {
    if (category.articleCount > 0) {
      showSnackBar(t('help_category_has_articles'), 'warning');
      return;
    }
    setSaving(true);
    try {
      await api.post(
        `documentation/admin/categories/${category.id}/archive`,
        {}
      );
      await refresh();
    } catch (error) {
      showSnackBar(getErrorMessage(error, t('help_save_failed')), 'error');
    } finally {
      setSaving(false);
    }
  };

  const restoreCategory = async (category: DocumentationCategory) => {
    setSaving(true);
    try {
      await api.post(
        `documentation/admin/categories/${category.id}/restore`,
        {}
      );
      await refresh();
      showSnackBar(t('help_category_restored'), 'success');
    } catch (error) {
      showSnackBar(getErrorMessage(error, t('help_save_failed')), 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      showSnackBar(t('help_image_invalid'), 'error');
      return;
    }
    const formData = new FormData();
    formData.set('file', file);
    const headers = new Headers(authHeader(false));
    headers.delete('Content-Type');
    try {
      const asset = await api.post<DocumentationAsset>(
        'documentation/admin/assets',
        formData,
        { headers },
        true
      );
      const editor = quillRef.current?.getEditor();
      if (!editor) return;
      const hydrated = await hydrateAuthorizedImages(
        apiImageUrl(asset.assetId)
      );
      rememberImageUrls(hydrated.assetUrls);
      const range = editor.getSelection(true);
      const index = range?.index ?? editor.getLength();
      editor.insertEmbed(
        index,
        'image',
        hydrated.assetUrls[asset.assetId],
        'user'
      );
      editor.setSelection(index + 1, 0, 'silent');
      const objectUrl = hydrated.assetUrls[asset.assetId];
      setPendingImage({ objectUrl, isNew: true });
      setImageAltText(
        file.name
          .replace(/\.[^.]+$/, '')
          .replace(/[_-]+/g, ' ')
          .trim()
      );
      setImageDecorative(false);
      setImageAltDialogOpen(true);
      showSnackBar(t('help_image_uploaded'), 'success');
    } catch (error) {
      showSnackBar(
        getErrorMessage(error, t('help_image_upload_failed')),
        'error'
      );
    }
  };

  const saveImageAlternativeText = () => {
    if (!pendingImage || (!imageDecorative && !imageAltText.trim())) return;
    const parsed = new DOMParser().parseFromString(
      articleDraft.content,
      'text/html'
    );
    const image = Array.from(parsed.body.querySelectorAll('img')).find(
      (candidate) => candidate.getAttribute('src') === pendingImage.objectUrl
    );
    if (image)
      image.setAttribute('alt', imageDecorative ? '' : imageAltText.trim());
    setArticleDraft({ ...articleDraft, content: parsed.body.innerHTML });
    setPendingImage(null);
    setImageAltDialogOpen(false);
  };

  const cancelImageAlternativeText = () => {
    if (pendingImage?.isNew) {
      const parsed = new DOMParser().parseFromString(
        articleDraft.content,
        'text/html'
      );
      parsed.body.querySelectorAll('img').forEach((image) => {
        if (image.getAttribute('src') === pendingImage.objectUrl)
          image.remove();
      });
      setArticleDraft({ ...articleDraft, content: parsed.body.innerHTML });
    }
    setPendingImage(null);
    setImageAltDialogOpen(false);
  };

  const editSelectedImageAlternativeText = () => {
    const editor = quillRef.current?.getEditor();
    const selection = editor?.getSelection();
    if (!editor || !selection) return;
    const [currentLeaf] = editor.getLeaf(selection.index);
    const [previousLeaf] = editor.getLeaf(Math.max(0, selection.index - 1));
    const image = [currentLeaf, previousLeaf]
      .map((leaf) => leaf?.domNode as HTMLImageElement | undefined)
      .find((node) => node?.tagName === 'IMG');
    if (!image || image.tagName !== 'IMG') return;
    const objectUrl = image.getAttribute('src');
    if (!objectUrl) return;
    const altText = image.getAttribute('alt') ?? '';
    setPendingImage({ objectUrl, isNew: false });
    setImageAltText(altText);
    setImageDecorative(image.hasAttribute('alt') && !altText.trim());
    setImageAltDialogOpen(true);
  };

  const previewHtml = (html: string) => {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    parsed
      .querySelectorAll('script,style,iframe,object,embed,form')
      .forEach((node) => node.remove());
    parsed.body.querySelectorAll('*').forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        if (attribute.name.toLowerCase().startsWith('on'))
          element.removeAttribute(attribute.name);
        if (
          ['href', 'src'].includes(attribute.name.toLowerCase()) &&
          /^\s*javascript:/i.test(attribute.value)
        )
          element.removeAttribute(attribute.name);
      });
    });
    return parsed.body.innerHTML;
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1.5}
      >
        <Box>
          <Typography variant="h4" component="h1" fontWeight={700}>
            {t('help_center_management')}
          </Typography>
          <Typography color="text.secondary">
            {t('help_center_management_intro')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<AddOutlinedIcon />}
            onClick={openNewCategory}
          >
            {t('help_new_category')}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            onClick={openNewArticle}
            disabled={!categories.some((category) => category.active)}
          >
            {t('help_new_article')}
          </Button>
        </Stack>
      </Stack>

      {loadError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={() => void refresh()}>
              {t('retry')}
            </Button>
          }
        >
          {t(loadErrorMessage)}
        </Alert>
      )}
      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={4}>
            <Stack spacing={1.25}>
              <Typography variant="h6" fontWeight={700}>
                {t('help_categories')}
              </Typography>
              {categories.length ? (
                categories.map((category) => (
                  <Card key={category.id} variant="outlined">
                    <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                      <Stack
                        direction="row"
                        alignItems="flex-start"
                        justifyContent="space-between"
                        spacing={1}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={700} noWrap>
                            {category.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {category.articleCount} · {category.slug}
                          </Typography>
                          {category.requiredPermission && (
                            <Chip
                              size="small"
                              label={category.requiredPermission}
                              sx={{ mt: 0.75 }}
                            />
                          )}
                        </Box>
                        <Stack direction="row" spacing={0.25}>
                          <IconButton
                            size="small"
                            aria-label={t('edit')}
                            onClick={() => openCategory(category)}
                          >
                            <Typography variant="caption">
                              {t('edit')}
                            </Typography>
                          </IconButton>
                          {category.active && (
                            <IconButton
                              size="small"
                              aria-label={t('archive')}
                              disabled={saving || category.articleCount > 0}
                              onClick={() =>
                                setPendingArchive({
                                  kind: 'category',
                                  category
                                })
                              }
                            >
                              <ArchiveOutlinedIcon fontSize="small" />
                            </IconButton>
                          )}
                          {!category.active && (
                            <IconButton
                              size="small"
                              aria-label={t('restore')}
                              disabled={saving}
                              onClick={() => void restoreCategory(category)}
                            >
                              <UnarchiveOutlinedIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Alert severity="info">{t('help_no_categories')}</Alert>
              )}
            </Stack>
          </Grid>
          <Grid item xs={12} md={8}>
            <Stack spacing={1.5}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={1}
              >
                <Typography variant="h6" fontWeight={700}>
                  {t('help_articles')}
                </Typography>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel id="help-status-filter-label">
                    {t('status')}
                  </InputLabel>
                  <Select
                    labelId="help-status-filter-label"
                    value={articleFilter}
                    label={t('status')}
                    onChange={(event) => setArticleFilter(event.target.value)}
                  >
                    <MenuItem value="ALL">{t('all')}</MenuItem>
                    <MenuItem value="DRAFT">{t('draft')}</MenuItem>
                    <MenuItem value="PUBLISHED">{t('published')}</MenuItem>
                    <MenuItem value="ARCHIVED">{t('archived')}</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              {filteredArticles.length ? (
                filteredArticles.map((article) => (
                  <Card key={article.id} variant="outlined">
                    <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        justifyContent="space-between"
                        alignItems={{ xs: 'stretch', sm: 'center' }}
                        spacing={1.5}
                      >
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ mb: 0.5 }}
                          >
                            <Typography fontWeight={700} noWrap>
                              {article.title}
                            </Typography>
                            <Chip
                              size="small"
                              label={article.status}
                              color={statusColor(article.status)}
                            />
                            {article.hasDraftChanges && (
                              <Chip
                                size="small"
                                variant="outlined"
                                label={t('help_unpublished_changes')}
                              />
                            )}
                          </Stack>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                          >
                            {article.categoryTitle} · {article.summary}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            /{article.slug}
                          </Typography>
                        </Box>
                        <Stack
                          direction="row"
                          spacing={0.75}
                          justifyContent="flex-end"
                        >
                          {article.status !== 'ARCHIVED' ? (
                            <Button
                              size="small"
                              onClick={() => void openArticle(article)}
                            >
                              {t('edit')}
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              startIcon={<UnarchiveOutlinedIcon />}
                              disabled={saving}
                              onClick={() => void restoreArticle(article)}
                            >
                              {t('restore')}
                            </Button>
                          )}
                          {article.status !== 'ARCHIVED' && (
                            <Button
                              size="small"
                              color="success"
                              startIcon={<PublishOutlinedIcon />}
                              disabled={
                                saving ||
                                (!article.hasDraftChanges &&
                                  article.status === 'PUBLISHED')
                              }
                              onClick={() => void publishArticle(article)}
                            >
                              {article.status === 'PUBLISHED'
                                ? t('help_publish_update')
                                : t('publish')}
                            </Button>
                          )}
                          {article.status !== 'ARCHIVED' && (
                            <IconButton
                              size="small"
                              aria-label={t('archive')}
                              disabled={saving}
                              onClick={() =>
                                setPendingArchive({ kind: 'article', article })
                              }
                            >
                              <ArchiveOutlinedIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Alert severity="info">{t('help_no_articles')}</Alert>
              )}
            </Stack>
          </Grid>
        </Grid>
      )}

      <Dialog
        open={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingCategoryId ? t('help_edit_category') : t('help_new_category')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              required
              label={t('help_category_title')}
              value={categoryDraft.title}
              onChange={(event) =>
                setCategoryDraft({
                  ...categoryDraft,
                  title: event.target.value
                })
              }
            />
            <TextField
              label={t('slug')}
              value={categoryDraft.slug}
              onChange={(event) =>
                setCategoryDraft({ ...categoryDraft, slug: event.target.value })
              }
              helperText={t('help_slug_helper')}
            />
            <TextField
              label={t('description')}
              multiline
              minRows={2}
              value={categoryDraft.description}
              onChange={(event) =>
                setCategoryDraft({
                  ...categoryDraft,
                  description: event.target.value
                })
              }
            />
            <TextField
              label={t('help_icon_name')}
              value={categoryDraft.icon}
              onChange={(event) =>
                setCategoryDraft({ ...categoryDraft, icon: event.target.value })
              }
              helperText={t('help_icon_helper')}
            />
            <TextField
              label={t('display_order')}
              type="number"
              value={categoryDraft.displayOrder}
              onChange={(event) =>
                setCategoryDraft({
                  ...categoryDraft,
                  displayOrder: Number(event.target.value)
                })
              }
            />
            <FormControl>
              <InputLabel id="help-category-permission-label">
                {t('help_visible_to_module')}
              </InputLabel>
              <Select
                labelId="help-category-permission-label"
                label={t('help_visible_to_module')}
                value={categoryDraft.requiredPermission ?? ''}
                onChange={(event) =>
                  setCategoryDraft({
                    ...categoryDraft,
                    requiredPermission: event.target.value
                  })
                }
              >
                <MenuItem value="">{t('help_all_permitted_users')}</MenuItem>
                {permissions.map((permission) => (
                  <MenuItem key={permission} value={permission}>
                    {permission}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryOpen(false)}>{t('cancel')}</Button>
          <Button
            variant="contained"
            onClick={() => void saveCategory()}
            disabled={saving || !categoryDraft.title.trim()}
          >
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editorOpen}
        onClose={requestCloseEditor}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle sx={{ pr: 7 }}>
          {editingArticle ? t('help_edit_article') : t('help_new_article')}
          <IconButton
            aria-label={t('close')}
            onClick={requestCloseEditor}
            sx={{ position: 'absolute', right: 12, top: 12 }}
          >
            <CloseOutlinedIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2.5}>
            <Grid item xs={12} md={8}>
              <Stack spacing={2}>
                <TextField
                  required
                  label={t('title')}
                  value={articleDraft.title}
                  onChange={(event) =>
                    setArticleDraft({
                      ...articleDraft,
                      title: event.target.value
                    })
                  }
                />
                <TextField
                  label={t('slug')}
                  value={articleDraft.slug}
                  onChange={(event) =>
                    setArticleDraft({
                      ...articleDraft,
                      slug: event.target.value
                    })
                  }
                  helperText={t('help_slug_helper')}
                />
                <TextField
                  required
                  label={t('summary')}
                  multiline
                  minRows={2}
                  value={articleDraft.summary}
                  onChange={(event) =>
                    setArticleDraft({
                      ...articleDraft,
                      summary: event.target.value
                    })
                  }
                />
                <Box>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mb: 1 }}
                  >
                    <Typography fontWeight={700}>
                      {t('help_article_content')}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<PreviewOutlinedIcon />}
                      onClick={() => setPreviewOpen(true)}
                    >
                      {t('preview')}
                    </Button>
                  </Stack>
                  <input
                    ref={imageInputRef}
                    hidden
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={uploadImage}
                  />
                  <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={articleDraft.content}
                    onChange={(content) =>
                      setArticleDraft({ ...articleDraft, content })
                    }
                    modules={quillModules}
                    placeholder={t('help_editor_placeholder')}
                  />
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={0.75}
                    sx={{ mt: 1 }}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <ImageOutlinedIcon fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">
                        {t('help_image_upload_hint')}
                      </Typography>
                    </Stack>
                    <Button
                      size="small"
                      onClick={editSelectedImageAlternativeText}
                    >
                      {t('help_edit_image_alt')}
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack spacing={2}>
                <FormControl required>
                  <InputLabel id="help-article-category-label">
                    {t('category')}
                  </InputLabel>
                  <Select
                    labelId="help-article-category-label"
                    label={t('category')}
                    value={articleDraft.categoryId || ''}
                    onChange={(event) =>
                      setArticleDraft({
                        ...articleDraft,
                        categoryId: Number(event.target.value)
                      })
                    }
                  >
                    {categories
                      .filter((category) => category.active)
                      .map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          {category.title}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
                <TextField
                  label={t('keywords')}
                  value={articleDraft.keywords.join(', ')}
                  onChange={(event) =>
                    setArticleDraft({
                      ...articleDraft,
                      keywords: event.target.value.split(',')
                    })
                  }
                  helperText={t('help_keywords_helper')}
                />
                <TextField
                  label={t('display_order')}
                  type="number"
                  value={articleDraft.displayOrder}
                  onChange={(event) =>
                    setArticleDraft({
                      ...articleDraft,
                      displayOrder: Number(event.target.value)
                    })
                  }
                />
                <FormControl>
                  <InputLabel id="help-article-permission-label">
                    {t('help_visible_to_module')}
                  </InputLabel>
                  <Select
                    labelId="help-article-permission-label"
                    label={t('help_visible_to_module')}
                    value={articleDraft.requiredPermission ?? ''}
                    onChange={(event) =>
                      setArticleDraft({
                        ...articleDraft,
                        requiredPermission: event.target.value
                      })
                    }
                  >
                    <MenuItem value="">
                      {t('help_use_category_visibility')}
                    </MenuItem>
                    {permissions.map((permission) => (
                      <MenuItem key={permission} value={permission}>
                        {permission}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {editingArticle && (
                  <Alert severity="info">
                    {editingArticle.status === 'PUBLISHED'
                      ? t('help_edit_published_note')
                      : t('help_draft_note')}
                  </Alert>
                )}
                <Divider />
                <Typography variant="caption" color="text.secondary">
                  {t('help_editor_supported_content')}
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={requestCloseEditor}>{t('cancel')}</Button>
          <Button
            variant="contained"
            startIcon={<SaveOutlinedIcon />}
            onClick={() => void saveArticle()}
            disabled={saving}
          >
            {saving ? t('saving') : t('save_draft')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={imageAltDialogOpen}
        onClose={cancelImageAlternativeText}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t('help_image_accessibility_title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography color="text.secondary">
              {t('help_image_accessibility_hint')}
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label={t('help_image_alt_text')}
              value={imageAltText}
              onChange={(event) => setImageAltText(event.target.value)}
              disabled={imageDecorative}
              required={!imageDecorative}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={imageDecorative}
                  onChange={(event) => setImageDecorative(event.target.checked)}
                />
              }
              label={t('help_image_decorative')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelImageAlternativeText}>{t('cancel')}</Button>
          <Button
            variant="contained"
            onClick={saveImageAlternativeText}
            disabled={!imageDecorative && !imageAltText.trim()}
          >
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {t('preview')} · {articleDraft.title}
        </DialogTitle>
        <DialogContent dividers>
          <Typography
            variant="h4"
            component="h1"
            fontWeight={700}
            sx={{ mb: 1 }}
          >
            {articleDraft.title || t('help_article_preview')}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {articleDraft.summary}
          </Typography>
          <Divider sx={{ mb: 3 }} />
          <Box
            className="help-article-content"
            dangerouslySetInnerHTML={{
              __html: previewHtml(articleDraft.content)
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>{t('close')}</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={openDiscardDialog}
        onCancel={() => setOpenDiscardDialog(false)}
        onConfirm={() => {
          setOpenDiscardDialog(false);
          setEditorOpen(false);
        }}
        confirmText={t('discard_changes')}
        question={t('discard_changes_question')}
      />
      <ConfirmDialog
        open={pendingArchive !== null}
        onCancel={() => setPendingArchive(null)}
        onConfirm={() => {
          const target = pendingArchive;
          setPendingArchive(null);
          if (target?.kind === 'article') void archiveArticle(target.article);
          else if (target?.kind === 'category')
            void archiveCategory(target.category);
        }}
        confirmText={t('archive')}
        question={
          pendingArchive?.kind === 'category'
            ? t('help_confirm_archive_category', {
                name: pendingArchive.category.title
              })
            : t('help_confirm_archive_article', {
                title:
                  pendingArchive?.kind === 'article'
                    ? pendingArchive.article.title
                    : ''
              })
        }
      />
    </Stack>
  );
}
