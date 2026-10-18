import React, { useEffect, useMemo, useRef, useState } from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import AssignmentRounded from "@mui/icons-material/AssignmentRounded";
import InboxRounded from "@mui/icons-material/InboxRounded";
import PrecisionManufacturingRounded from "@mui/icons-material/PrecisionManufacturingRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import NotificationsNoneRounded from "@mui/icons-material/NotificationsNoneRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import AddRounded from "@mui/icons-material/AddRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import BoltRounded from "@mui/icons-material/BoltRounded";
import AccessTimeRounded from "@mui/icons-material/AccessTimeRounded";
import PlaceRounded from "@mui/icons-material/PlaceRounded";
import TuneRounded from "@mui/icons-material/TuneRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import BuildRounded from "@mui/icons-material/BuildRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DarkModeRounded from "@mui/icons-material/DarkModeRounded";
import LightModeRounded from "@mui/icons-material/LightModeRounded";
import DevicesRounded from "@mui/icons-material/DevicesRounded";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import QrCode2Rounded from "@mui/icons-material/QrCode2Rounded";
import NfcRounded from "@mui/icons-material/NfcRounded";
import { QRCodeSVG } from "qrcode.react";
import { qpmTokens } from "./tokens";

const navItems = [
  {
    id: "dashboard",
    label: "Tableau de bord",
    icon: <DashboardRounded />,
    screen: "WEB-005",
  },
  {
    id: "workorders",
    label: "Ordres de travail",
    icon: <AssignmentRounded />,
    screen: "WEB-054",
  },
  {
    id: "requests",
    label: "Demandes de maintenance",
    icon: <InboxRounded />,
    screen: "WEB-045",
  },
  {
    id: "asset",
    label: "Équipements",
    icon: <PrecisionManufacturingRounded />,
    screen: "WEB-062",
  },
  {
    id: "appearance",
    label: "Apparence",
    icon: <SettingsRounded />,
    screen: "Prototype",
  },
];
const operationsNavItems = navItems.filter((item) => item.id !== "appearance");
const preferenceNavItems = navItems.filter((item) => item.id === "appearance");
const woRows = [
  {
    id: "WO-2026-01842",
    title: "Remplacer le roulement côté entraînement",
    asset: "Convoyeur CV-04",
    location: "Concasseur · Niveau 2",
    priority: "Urgente",
    status: "En cours",
    due: "Aujourd’hui · 14:30",
    person: "M. Diallo",
    initials: "MD",
    tone: "urgent",
  },
  {
    id: "WO-2026-01839",
    title: "Inspection mensuelle du moteur",
    asset: "Moteur MT-12",
    location: "Pompage · Bâtiment A",
    priority: "Haute",
    status: "En attente",
    due: "Aujourd’hui · 16:00",
    person: "A. Traoré",
    initials: "AT",
    tone: "high",
  },
  {
    id: "WO-2026-01834",
    title: "Contrôle du niveau d’huile",
    asset: "Compresseur CP-02",
    location: "Atelier utilités",
    priority: "Normale",
    status: "Planifié",
    due: "Demain · 08:00",
    person: "Équipe mécanique",
    initials: "EM",
    tone: "normal",
  },
  {
    id: "WO-2026-01831",
    title: "Vérifier l’alignement de la pompe",
    asset: "Pompe PU-08",
    location: "Circuit de lavage",
    priority: "Haute",
    status: "En cours",
    due: "Demain · 10:00",
    person: "S. Koné",
    initials: "SK",
    tone: "high",
  },
  {
    id: "WO-2026-01825",
    title: "Remplacer le capteur de température",
    asset: "Four FR-01",
    location: "Ligne de traitement",
    priority: "Normale",
    status: "En revue",
    due: "16 oct. · 09:00",
    person: "C. Barry",
    initials: "CB",
    tone: "normal",
  },
];
const requests = [
  {
    id: "REQ-2026-00618",
    title: "Bruit anormal à l’entraînement",
    asset: "Convoyeur CV-04",
    requester: "M. Diallo",
    age: "18 min",
    priority: "Haute",
    status: "À qualifier",
  },
  {
    id: "REQ-2026-00615",
    title: "Fuite hydraulique détectée",
    asset: "Presse PR-03",
    requester: "A. Traoré",
    age: "2 h",
    priority: "Urgente",
    status: "À qualifier",
  },
  {
    id: "REQ-2026-00607",
    title: "Éclairage de zone défectueux",
    asset: "Atelier mécanique",
    requester: "S. Koné",
    age: "Hier",
    priority: "Normale",
    status: "En analyse",
  },
];
const themeFor = (mode) => {
  const t = mode === "dark" ? qpmTokens.dark : qpmTokens.light;
  return createTheme({
    palette: {
      mode: mode === "dark" ? "dark" : "light",
      primary: { main: t.brand, contrastText: t.onBrand },
      background: { default: t.canvas, paper: t.surface },
      text: { primary: t.text, secondary: t.muted },
      divider: t.border,
      success: { main: t.success },
      warning: { main: t.warning },
      error: { main: t.error },
      info: { main: t.info },
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily: 'Inter, "Segoe UI", Arial, sans-serif',
      h1: { fontSize: "1.8rem", fontWeight: 760, letterSpacing: "-.04em" },
      h2: { fontSize: "1.25rem", fontWeight: 720, letterSpacing: "-.025em" },
      h3: { fontSize: "1.05rem", fontWeight: 700 },
      button: { fontWeight: 700, textTransform: "none" },
    },
    components: {
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiButton: {
        styleOverrides: { root: { borderRadius: 11, minHeight: 40 } },
      },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 11 } } },
    },
  });
};

function StateBadge({ children, kind = "neutral" }) {
  return (
    <Chip size="small" label={children} className={`state-badge ${kind}`} />
  );
}
function KpiCard({ icon, label, value, detail, kind, onClick }) {
  return (
    <Paper
      component={onClick ? "button" : "div"}
      type={onClick ? "button" : undefined}
      className={`kpi-card${onClick ? " clickable" : ""}`}
      onClick={onClick}
      aria-label={onClick ? `${label} : ${value}. ${detail}` : undefined}
      elevation={0}
    >
      <div className={`kpi-icon ${kind}`}>{icon}</div>
      <Typography className="kpi-label">{label}</Typography>
      <Typography className="kpi-value">{value}</Typography>
      <Typography className="muted kpi-detail">{detail}</Typography>
    </Paper>
  );
}
function SectionTitle({ title, subtitle, action }) {
  return (
    <div className="section-heading">
      <div>
        <Typography variant="h2">{title}</Typography>
        {subtitle && (
          <Typography className="muted" variant="body2">
            {subtitle}
          </Typography>
        )}
      </div>
      {action}
    </div>
  );
}

export default function App() {
  const [appearance, setAppearance] = useState("light");
  const [screen, setScreen] = useState("dashboard");
  const [selectedWo, setSelectedWo] = useState(woRows[0]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tous les statuts");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialog, setDialog] = useState("");
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const systemPrefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const effectiveMode =
    appearance === "system"
      ? systemPrefersDark
        ? "dark"
        : "light"
      : appearance;
  const theme = useMemo(() => themeFor(effectiveMode), [effectiveMode]);
  const isSmall = useMediaQuery(theme.breakpoints.down("md"));
  const rows = woRows.filter(
    (row) =>
      `${row.id} ${row.title} ${row.asset} ${row.person}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (statusFilter === "Tous les statuts" || row.status === statusFilter)
  );
  const go = (id) => {
    setScreen(id);
    setDrawerOpen(false);
    setActiveTab(0);
  };
  const openDetail = (row) => {
    setSelectedWo(row);
    go("workorder-detail");
  };
  const announceSimulation = (label) => {
    setDialog("");
    setNotice(`${label} — interaction de démonstration uniquement.`);
  };

  const shell = (
    <div className="app-shell" data-theme={effectiveMode}>
      <Drawer
        variant={isSmall ? "temporary" : "permanent"}
        open={isSmall ? drawerOpen : true}
        onClose={() => setDrawerOpen(false)}
        className="sidebar-drawer"
        PaperProps={{ className: "sidebar-paper" }}
      >
        <div className="brand-lockup">
          <div className="brand-mark">Q</div>
          <div>
            <strong>QPM</strong>
            <small>Maintenance industrielle</small>
          </div>
          {isSmall && (
            <IconButton
              sx={{ marginLeft: "auto" }}
              onClick={() => setDrawerOpen(false)}
              aria-label="Fermer le menu"
            >
              <CloseRounded />
            </IconButton>
          )}
        </div>
        <div className="workspace-switch">
          <span className="workspace-avatar">K</span>
          <span>
            <b>Konakry Mining</b>
            <small>Site · Kamsar</small>
          </span>
          <MoreHorizRounded fontSize="small" />
        </div>
        <Typography className="nav-caption">MAINTENANCE</Typography>
        <nav aria-label="Navigation principale">
          {operationsNavItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${
                screen === item.id ||
                (item.id === "workorders" && screen === "workorder-detail")
                  ? "selected"
                  : ""
              }`}
              onClick={() => go(item.id)}
              aria-current={screen === item.id ? "page" : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <Typography className="nav-caption preference-caption">
          PRÉFÉRENCES
        </Typography>
        <nav aria-label="Préférences">
          {preferenceNavItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${screen === item.id ? "selected" : ""}`}
              onClick={() => go(item.id)}
              aria-current={screen === item.id ? "page" : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="online-dot" /> Données de démonstration{" "}
            <small>Aucun appel API</small>
          </div>
          <div className="profile-row">
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: "primary.main",
                fontSize: 13,
              }}
            >
              AD
            </Avatar>
            <span>
              <b>Amadou Diallo</b>
              <small>Superviseur maintenance</small>
            </span>
            <MoreHorizRounded fontSize="small" />
          </div>
        </div>
      </Drawer>
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            {isSmall && (
              <IconButton
                aria-label="Ouvrir le menu"
                onClick={() => setDrawerOpen(true)}
              >
                <MenuRounded />
              </IconButton>
            )}
            <div className="crumb">
              QPM <span>/</span>{" "}
              {navItems.find((n) => n.id === screen)?.label ||
                "Ordres de travail"}
            </div>
            <Chip
              className="prototype-label"
              size="small"
              label="PROTO · MOCK DATA"
            />
          </div>
          <div className="topbar-actions">
            <TextField
              size="small"
              placeholder="Rechercher dans la démo"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded fontSize="small" />
                  </InputAdornment>
                ),
              }}
              className="global-search"
              inputProps={{
                "aria-label": "Rechercher dans les données de démonstration",
              }}
            />
            <Tooltip title="Notifications simulées">
              <IconButton aria-label="Notifications">
                <Badge variant="dot" color="error">
                  <NotificationsNoneRounded />
                </Badge>
              </IconButton>
            </Tooltip>
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: "primary.main",
                fontSize: 12,
              }}
            >
              AD
            </Avatar>
          </div>
        </header>
        <div className="content-wrap">
          {screen === "dashboard" && (
            <Dashboard go={go} openDetail={openDetail} setDialog={setDialog} />
          )}
          {screen === "workorders" && (
            <WorkOrders
              rows={rows}
              query={query}
              setQuery={setQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              openDetail={openDetail}
              setDialog={setDialog}
            />
          )}
          {screen === "workorder-detail" && (
            <WorkOrderDetail
              row={selectedWo}
              go={go}
              setDialog={setDialog}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          )}
          {screen === "requests" && <Requests setDialog={setDialog} />}
          {screen === "asset" && (
            <Asset360
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              openDetail={openDetail}
              setDialog={setDialog}
            />
          )}
          {screen === "appearance" && (
            <Appearance appearance={appearance} setAppearance={setAppearance} />
          )}
          {screen === "gallery" && <ComponentGallery />}
          <footer className="prototype-footer">
            Prototype isolé · données fictives · aucun appel API · routes et
            règles métier de production inchangées{" "}
            <button onClick={() => go("gallery")}>Galerie composants</button>
          </footer>
        </div>
      </main>
      <Dialog
        open={Boolean(dialog)}
        onClose={() => setDialog("")}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Action simulée</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Cette maquette ne communique pas avec QPM. L’action permet
            uniquement d’évaluer la présentation et le retour visuel.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog("")}>Annuler</Button>
          <Button
            variant="contained"
            onClick={() => announceSimulation(dialog)}
          >
            Voir le retour
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={3600}
        onClose={() => setNotice("")}
        message={notice}
      />
    </div>
  );
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {shell}
    </ThemeProvider>
  );
}

function PageIntro({ eyebrow, title, subtitle, action, back }) {
  return (
    <div className="page-intro">
      {back && (
        <IconButton className="back-button" onClick={back} aria-label="Retour">
          <ArrowBackRounded />
        </IconButton>
      )}
      <div>
        <Typography className="eyebrow">{eyebrow}</Typography>
        <Typography variant="h1">{title}</Typography>
        <Typography color="text.secondary">{subtitle}</Typography>
      </div>
      {action && <div className="page-action">{action}</div>}
    </div>
  );
}

function Dashboard({ go, openDetail, setDialog }) {
  return (
    <>
      <PageIntro
        eyebrow="MERCREDI 14 OCTOBRE 2026 · ÉQUIPE DE JOUR"
        title="Vue opérationnelle"
        subtitle="Les priorités de maintenance pour le site de Kamsar."
        action={
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            onClick={() => setDialog("Créer un ordre de travail")}
          >
            Nouvel ordre
          </Button>
        }
      />
      <div className="kpi-grid">
        <KpiCard
          kind="blue"
          icon={<AssignmentRounded />}
          label="Ordres ouverts"
          value="24"
          detail="6 à traiter aujourd’hui"
          onClick={() => go("workorders")}
        />
        <KpiCard
          kind="orange"
          icon={<WarningAmberRounded />}
          label="En retard"
          value="03"
          detail="1 priorité urgente"
          onClick={() => go("workorders")}
        />
        <KpiCard
          kind="green"
          icon={<CheckCircleRounded />}
          label="Préventif à jour"
          value="92%"
          detail="+4,2% sur les 30 derniers jours"
        />
        <KpiCard
          kind="purple"
          icon={<BuildRounded />}
          label="Demandes à qualifier"
          value="08"
          detail="2 depuis la dernière heure"
          onClick={() => go("requests")}
        />
      </div>
      <div className="dashboard-grid">
        <Paper className="panel work-queue" elevation={0}>
          <SectionTitle
            title="À traiter maintenant"
            subtitle="Ordres actifs triés par priorité et échéance"
            action={
              <Button
                endIcon={<ArrowForwardRounded />}
                onClick={() => go("workorders")}
              >
                Tout voir
              </Button>
            }
          />
          <div className="queue-list">
            {woRows.slice(0, 4).map((row) => (
              <button
                className="queue-row"
                key={row.id}
                onClick={() => openDetail(row)}
              >
                <div className={`priority-rail ${row.tone}`} />
                <div className="queue-main">
                  <div className="queue-title-line">
                    <b>{row.title}</b>
                    <StateBadge kind={row.tone}>{row.status}</StateBadge>
                  </div>
                  <div className="queue-meta">
                    <span>{row.id}</span>
                    <span>·</span>
                    <span>{row.asset}</span>
                    <span>·</span>
                    <span>
                      <AccessTimeRounded /> {row.due}
                    </span>
                  </div>
                </div>
                <Avatar className="queue-avatar">{row.initials}</Avatar>
                <ArrowForwardRounded className="queue-arrow" />
              </button>
            ))}
          </div>
        </Paper>
        <Paper className="panel schedule-panel" elevation={0}>
          <SectionTitle
            title="Prochainement"
            subtitle="Charge des 3 prochains jours"
            action={
              <IconButton aria-label="Calendrier simulé">
                <CalendarMonthRounded />
              </IconButton>
            }
          />
          <div className="schedule-date">
            <div>
              <b>14</b>
              <small>MER</small>
            </div>
            <div>
              <b>15</b>
              <small>JEU</small>
            </div>
            <div>
              <b>16</b>
              <small>VEN</small>
            </div>
            <div>
              <b>17</b>
              <small>SAM</small>
            </div>
          </div>
          <div className="schedule-item">
            <span className="schedule-time">10:30</span>
            <span className="schedule-line" />
            <span>
              <b>Inspection CV-04</b>
              <small>Convoyeur · 45 min</small>
            </span>
            <StateBadge kind="high">Haute</StateBadge>
          </div>
          <div className="schedule-item">
            <span className="schedule-time">13:00</span>
            <span className="schedule-line green" />
            <span>
              <b>Graissage moteur MT-12</b>
              <small>Moteur · 30 min</small>
            </span>
            <StateBadge kind="normal">Planifié</StateBadge>
          </div>
          <div className="schedule-item">
            <span className="schedule-time">15:30</span>
            <span className="schedule-line purple" />
            <span>
              <b>Contrôle pompe PU-08</b>
              <small>Pompage · 1 h</small>
            </span>
            <StateBadge kind="normal">Planifié</StateBadge>
          </div>
          <Button
            fullWidth
            className="schedule-link"
            endIcon={<ArrowForwardRounded />}
            onClick={() => setDialog("Ouvrir le calendrier")}
          >
            Ouvrir le calendrier
          </Button>
        </Paper>
        <Paper className="panel pm-panel" elevation={0}>
          <div className="pm-copy">
            <div className="kpi-icon green">
              <CalendarMonthRounded />
            </div>
            <div>
              <Typography variant="h3">Maintenance préventive</Typography>
              <Typography color="text.secondary">
                12 interventions planifiées cette semaine. 2 nécessitent une
                confirmation.
              </Typography>
            </div>
          </div>
          <div className="pm-progress">
            <div>
              <span>Planification de la semaine</span>
              <b>83%</b>
            </div>
            <LinearProgress variant="determinate" value={83} />
          </div>
          <Button
            variant="outlined"
            onClick={() => setDialog("Consulter le planning préventif")}
          >
            Consulter le planning
          </Button>
        </Paper>
      </div>
    </>
  );
}

function WorkOrders({
  rows,
  query,
  setQuery,
  statusFilter,
  setStatusFilter,
  openDetail,
  setDialog,
}) {
  return (
    <>
      <PageIntro
        eyebrow="TRAVAIL / EXÉCUTION"
        title="Ordres de travail"
        subtitle="Pilote WEB-054 · Rechercher, prioriser et ouvrir un ordre."
        action={
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            onClick={() => setDialog("Créer un ordre de travail")}
          >
            Créer un ordre
          </Button>
        }
      />
      <Paper className="panel table-panel" elevation={0}>
        <div className="toolbar">
          <div className="toolbar-search">
            <TextField
              placeholder="WO, équipement, description…"
              size="small"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRounded fontSize="small" />
                  </InputAdornment>
                ),
              }}
              inputProps={{ "aria-label": "Filtrer les ordres de travail" }}
            />
          </div>
          <FormControl size="small" className="status-select">
            <InputLabel>Statut</InputLabel>
            <Select
              value={statusFilter}
              label="Statut"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="Tous les statuts">Tous les statuts</MenuItem>
              {["En cours", "En attente", "Planifié", "En revue"].map((s) => (
                <MenuItem value={s} key={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<TuneRounded />}
            onClick={() => setDialog("Filtres avancés")}
          >
            Filtres
          </Button>
          <Button
            variant="text"
            onClick={() => {
              setQuery("");
              setStatusFilter("Tous les statuts");
            }}
          >
            Réinitialiser
          </Button>
        </div>
        <div className="result-meta">
          <span>
            <b>{rows.length}</b> ordres affichés
          </span>
          <span>Actualisé à 09:42 · données fictives</span>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>ORDRE / DESCRIPTION</th>
                <th>ÉQUIPEMENT / EMPLACEMENT</th>
                <th>PRIORITÉ</th>
                <th>STATUT</th>
                <th>ÉCHÉANCE</th>
                <th>AFFECTÉ À</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((row) => (
                  <tr
                    key={row.id}
                    role="button"
                    aria-label={`Ouvrir ${row.id}, ${row.title}`}
                    tabIndex="0"
                    onClick={() => openDetail(row)}
                    onKeyDown={(e) =>
                      (e.key === "Enter" || e.key === " ") &&
                      (e.preventDefault(), openDetail(row))
                    }
                  >
                    <td>
                      <b className="wo-title">{row.title}</b>
                      <small>{row.id}</small>
                    </td>
                    <td>
                      <b>{row.asset}</b>
                      <small>{row.location}</small>
                    </td>
                    <td>
                      <StateBadge kind={row.tone}>{row.priority}</StateBadge>
                    </td>
                    <td>
                      <StateBadge
                        kind={
                          row.status === "En cours"
                            ? "blue"
                            : row.status === "En attente"
                            ? "high"
                            : "neutral"
                        }
                      >
                        {row.status}
                      </StateBadge>
                    </td>
                    <td>
                      <span
                        className={row.tone === "urgent" ? "overdue-text" : ""}
                      >
                        {row.due}
                      </span>
                    </td>
                    <td>
                      <div className="assignee">
                        <Avatar>{row.initials}</Avatar>
                        {row.person}
                      </div>
                    </td>
                    <td>
                      <IconButton
                        aria-label={`Actions pour ${row.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDialog(`Actions pour ${row.id}`);
                        }}
                      >
                        <MoreHorizRounded />
                      </IconButton>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <SearchRounded />
                      <b>Aucun ordre correspondant</b>
                      <span>
                        Modifiez la recherche ou réinitialisez les filtres.
                      </span>
                      <Button
                        onClick={() => {
                          setQuery("");
                          setStatusFilter("Tous les statuts");
                        }}
                      >
                        Réinitialiser
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="table-pagination">
          <span>
            Lignes 1–{rows.length} sur {rows.length} · pagination simulée
          </span>
          <Button disabled>Précédent</Button>
          <Button disabled>Suivant</Button>
        </div>
      </Paper>
    </>
  );
}

function WorkOrderDetail({ row, go, setDialog, activeTab, setActiveTab }) {
  return (
    <>
      <PageIntro
        back={() => go("workorders")}
        eyebrow={`WEB-055 · ${row.id}`}
        title={row.title}
        subtitle={`${row.asset} · ${row.location}`}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<MoreHorizRounded />}
              onClick={() => setDialog("Autres actions WO")}
            >
              Actions
            </Button>
            <Button
              variant="contained"
              onClick={() => setDialog("Action de statut")}
            >
              Démarrer
            </Button>
          </Stack>
        }
      />
      <div className="detail-summary">
        <StateBadge kind="blue">{row.status}</StateBadge>
        <StateBadge kind={row.tone}>{row.priority} priorité</StateBadge>
        <span>
          <CalendarMonthRounded /> Échéance : {row.due}
        </span>
        <span>
          <PersonOutlineRounded /> {row.person}
        </span>
        <span>
          <PlaceRounded /> Site de Kamsar
        </span>
      </div>
      <Paper className="panel detail-panel" elevation={0}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          allowScrollButtonsMobile
          aria-label="Sections de l’ordre"
        >
          <Tab label="Vue d’ensemble" />
          <Tab label="Tâches (3)" />
          <Tab label="Temps & coûts" />
          <Tab label="Pièces & fichiers" />
          <Tab label="Historique" />
        </Tabs>
        <Divider />
        {activeTab === 0 ? (
          <div className="detail-grid">
            <section>
              <Typography variant="h3">Instructions de travail</Typography>
              <Typography className="detail-body">
                Isoler l’entraînement selon la procédure du site. Inspecter le
                palier côté moteur, relever l’état du roulement et remplacer la
                pièce si le jeu dépasse les tolérances du fabricant.
              </Typography>
              <div className="detail-block">
                <b>Signalement</b>
                <p>
                  Vibration inhabituelle constatée pendant la ronde de début de
                  poste.
                </p>
              </div>
              <div className="detail-block">
                <b>Équipement</b>
                <p>Convoyeur CV-04 · Ligne de concassage primaire</p>
                <Button
                  onClick={() => go("asset")}
                  endIcon={<ArrowForwardRounded />}
                >
                  Ouvrir Equipment 360
                </Button>
              </div>
            </section>
            <aside>
              <div className="progress-heading">
                <b>Avancement des tâches</b>
                <span>1 sur 3</span>
              </div>
              <LinearProgress variant="determinate" value={33} />
              <div className="task-preview">
                <CheckCircleRounded color="success" />
                <span>
                  <b>Consigner l’équipement</b>
                  <small>Terminé · M. Diallo</small>
                </span>
              </div>
              <div className="task-preview pending">
                <span className="task-circle" />
                <span>
                  <b>Inspecter le roulement</b>
                  <small>À faire</small>
                </span>
              </div>
              <div className="task-preview pending">
                <span className="task-circle" />
                <span>
                  <b>Enregistrer le travail et les pièces</b>
                  <small>À faire</small>
                </span>
              </div>
              <Alert severity="info" icon={<BoltRounded />}>
                Démonstration : les actions ne modifient aucun WO réel.
              </Alert>
            </aside>
          </div>
        ) : (
          <div className="tab-placeholder">
            <div className="kpi-icon blue">
              <AssignmentRounded />
            </div>
            <Typography variant="h3">
              {
                [
                  "Vue d’ensemble",
                  "Liste de tâches",
                  "Temps et coûts",
                  "Pièces et fichiers",
                  "Historique",
                ][activeTab]
              }
            </Typography>
            <Typography color="text.secondary">
              Aperçu de composition pour {row.id}. Les données de cette maquette
              sont fictives et aucun changement métier n’est effectué.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => setDialog("Interagir avec la section")}
            >
              Tester l’action de section
            </Button>
          </div>
        )}
      </Paper>
    </>
  );
}

function Requests({ setDialog }) {
  const [filter, setFilter] = useState("all");
  const visibleRequests = requests.filter(
    (request) =>
      filter === "all" ||
      (filter === "new"
        ? request.status === "À qualifier"
        : request.status === "En analyse")
  );
  return (
    <>
      <PageIntro
        eyebrow="TRAVAIL / DEMANDES"
        title="Demandes de maintenance"
        subtitle="WEB-045 · Qualifier et orienter les nouveaux signalements."
        action={
          <Button
            variant="outlined"
            startIcon={<DownloadRounded />}
            onClick={() => setDialog("Exporter les demandes")}
          >
            Exporter
          </Button>
        }
      />
      <div className="request-summary">
        <Paper className="panel request-count" elevation={0}>
          <span>À qualifier</span>
          <b>05</b>
          <small>2 nouvelles aujourd’hui</small>
        </Paper>
        <Paper className="panel request-count" elevation={0}>
          <span>En analyse</span>
          <b>03</b>
          <small>Temps moyen · 1 h 24</small>
        </Paper>
        <Paper className="panel request-count" elevation={0}>
          <span>Converties en WO</span>
          <b>18</b>
          <small>Ce mois-ci</small>
        </Paper>
      </div>
      <Paper className="panel requests-panel" elevation={0}>
        <SectionTitle
          title="File de demandes"
          subtitle="Les demandes restent des signalements jusqu’à leur qualification."
          action={
            <Button
              startIcon={<RefreshRounded />}
              onClick={() => setDialog("Actualiser la file")}
            >
              Actualiser
            </Button>
          }
        />
        <div className="request-tabs">
          <ToggleButtonGroup
            size="small"
            exclusive
            value={filter}
            onChange={(_, value) => value && setFilter(value)}
          >
            <ToggleButton value="all">
              Toutes <b>8</b>
            </ToggleButton>
            <ToggleButton value="new">
              À qualifier <b>5</b>
            </ToggleButton>
            <ToggleButton value="review">
              En analyse <b>3</b>
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
        {visibleRequests.length ? (
          visibleRequests.map((request) => (
            <div className="request-row" key={request.id}>
              <div className="request-leading">
                <div className="request-icon">
                  <InboxRounded />
                </div>
                <div>
                  <div className="request-title">
                    <b>{request.title}</b>
                    <StateBadge
                      kind={
                        request.priority === "Urgente"
                          ? "urgent"
                          : request.priority === "Haute"
                          ? "high"
                          : "normal"
                      }
                    >
                      {request.priority}
                    </StateBadge>
                  </div>
                  <div className="request-meta">
                    <span>{request.id}</span>
                    <span>{request.asset}</span>
                    <span>Par {request.requester}</span>
                    <span>{request.age}</span>
                  </div>
                </div>
              </div>
              <div className="request-actions">
                <StateBadge kind="high">{request.status}</StateBadge>
                <Button
                  variant="outlined"
                  onClick={() => setDialog(`Ouvrir ${request.id}`)}
                >
                  Examiner
                </Button>
                <IconButton
                  aria-label={`Plus d'actions ${request.id}`}
                  onClick={() => setDialog(`Actions ${request.id}`)}
                >
                  <MoreHorizRounded />
                </IconButton>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <InboxRounded />
            <b>Aucune demande dans cette vue</b>
            <span>Choisissez un autre filtre pour élargir la file.</span>
          </div>
        )}
      </Paper>
    </>
  );
}

function Asset360({ activeTab, setActiveTab, openDetail, setDialog }) {
  const [tagDialog, setTagDialog] = useState("");
  const [nfcCheck, setNfcCheck] = useState(null);
  const [nfcReading, setNfcReading] = useState(false);
  const [nfcResult, setNfcResult] = useState("");
  const [nfcError, setNfcError] = useState("");
  const nfcAbortRef = useRef(null);
  const qrValue = "CV04-METSO-9C21";

  useEffect(
    () => () => {
      nfcAbortRef.current?.abort();
    },
    []
  );

  const downloadAssetQr = () => {
    const svg = document.getElementById("prototype-asset-qr");
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(
      new Blob([data], { type: "image/svg+xml;charset=utf-8" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "QPM-CV-04-QR.svg";
    link.click();
    URL.revokeObjectURL(url);
  };

  const checkWebNfc = () => {
    setNfcCheck({
      secure: window.isSecureContext,
      supported: "NDEFReader" in window,
    });
  };

  const startNfcRead = async () => {
    setNfcCheck(null);
    setNfcResult("");
    setNfcError("");
    if (!window.isSecureContext || !("NDEFReader" in window)) {
      checkWebNfc();
      return;
    }

    const controller = new AbortController();
    nfcAbortRef.current = controller;
    setNfcReading(true);
    try {
      const reader = new window.NDEFReader();
      reader.addEventListener(
        "reading",
        (event) => {
          const serialNumber = event.serialNumber || "";
          const textRecord = Array.from(event.message.records || []).find(
            (record) => record.recordType === "text"
          );
          let ndefText = "";
          if (textRecord) {
            try {
              ndefText = new TextDecoder().decode(textRecord.data);
            } catch (_) {
              ndefText = "";
            }
          }
          setNfcResult(serialNumber || ndefText || "Tag lu, sans identifiant exploitable");
          setNfcReading(false);
          controller.abort();
        },
        { once: true }
      );
      reader.addEventListener(
        "readingerror",
        () => {
          setNfcError("Ce tag ne fournit pas de message NDEF lisible par le navigateur.");
          setNfcReading(false);
          controller.abort();
        },
        { once: true }
      );
      await reader.scan({ signal: controller.signal });
    } catch (error) {
      setNfcReading(false);
      if (error?.name !== "AbortError") {
        setNfcError(
          error?.name === "NotAllowedError"
            ? "Autorisation NFC refusée. Autorisez la lecture dans le navigateur puis réessayez."
            : `Lecture NFC impossible : ${error?.message || "vérifiez le téléphone, le NFC et les permissions du navigateur."}`
        );
      }
    }
  };

  const cancelNfcRead = () => {
    nfcAbortRef.current?.abort();
    nfcAbortRef.current = null;
    setNfcReading(false);
  };

  const closeNfcDialog = () => {
    cancelNfcRead();
    setTagDialog("");
  };

  return (
    <>
      <PageIntro
        eyebrow="ACTIFS / EQUIPMENT 360 · WEB-062"
        title="Convoyeur CV-04"
        subtitle="Convoyeur de minerai · Ligne de concassage primaire"
        action={
          <Button
            variant="outlined"
            startIcon={<MoreHorizRounded />}
            onClick={() => setDialog("Actions équipement")}
          >
            Actions équipement
          </Button>
        }
      />
      <Paper className="asset-hero panel" elevation={0}>
        <div className="asset-identity">
          <div className="asset-picture">
            <PrecisionManufacturingRounded />
          </div>
          <div>
            <div className="asset-tags">
              <StateBadge kind="green">En service</StateBadge>
              <StateBadge kind="urgent">Criticité A</StateBadge>
            </div>
            <Typography variant="h2">CV-04 · Convoyeur principal</Typography>
            <p>
              Fabricant <b>Metso</b> · Modèle <b>CVX-1200</b> · Série{" "}
              <b>MX-44-0281</b>
            </p>
            <div className="asset-location">
              <PlaceRounded /> Kamsar / Concassage / Niveau 2 / Ligne CV-04
            </div>
          </div>
        </div>
        <Button
          variant="contained"
          startIcon={<AddRounded />}
          onClick={() => setDialog("Créer un WO lié à CV-04")}
        >
          Créer un WO
        </Button>
      </Paper>
      <div className="asset-kpis">
        <Paper className="panel asset-metric" elevation={0}>
          <span>WO ouverts</span>
          <b>02</b>
          <small>1 en cours · 1 planifié</small>
        </Paper>
        <Paper className="panel asset-metric" elevation={0}>
          <span>Prochaine maintenance</span>
          <b className="metric-small">18 oct. 2026</b>
          <small>Inspection mécanique · PM hebdomadaire</small>
        </Paper>
        <Paper className="panel asset-metric" elevation={0}>
          <span>Dernier relevé</span>
          <b className="metric-small">8 431 h</b>
          <small>Compteur de fonctionnement · 12 oct.</small>
        </Paper>
        <Paper className="panel asset-metric" elevation={0}>
          <span>Arrêt cumulé · 90 j</span>
          <b>4,2 h</b>
          <small>3 événements enregistrés</small>
        </Paper>
      </div>
      <Paper className="panel asset-tabs" elevation={0}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          allowScrollButtonsMobile
          aria-label="Sections équipement"
        >
          <Tab label="Vue d’ensemble" />
          <Tab label="Ordres de travail" />
          <Tab label="Détails techniques" />
          <Tab label="Pièces" />
          <Tab label="Fichiers" />
          <Tab label="Compteurs" />
          <Tab label="Arrêts" />
          <Tab label="Analyses" />
        </Tabs>
        <Divider />
        {activeTab === 0 ? (
          <div className="asset-content-grid">
            <section className="asset-overview">
              <SectionTitle title="Contexte équipement" />
              <div className="asset-info-grid">
                <Info label="Code équipement" value="CV-04" />
                <Info
                  label="Emplacement fonctionnel"
                  value="Concassage / Niveau 2"
                />
                <Info
                  label="Équipement parent"
                  value="Ligne de concassage primaire"
                />
                <Info label="Date de mise en service" value="14 juin 2021" />
                <Info
                  label="Condition"
                  value="Données de condition non configurées"
                />
                <Info label="Responsable" value="Équipe mécanique" />
              </div>
              <SectionTitle
                title="Interventions récentes"
                subtitle="Enregistrements liés à l’actif"
                action={
                  <Button onClick={() => setActiveTab(1)}>Tout voir</Button>
                }
              />
              {woRows.slice(0, 2).map((row) => (
                <button
                  className="asset-wo-row"
                  key={row.id}
                  onClick={() => openDetail(row)}
                >
                  <span className="asset-wo-icon">
                    <AssignmentRounded />
                  </span>
                  <span>
                    <b>{row.title}</b>
                    <small>
                      {row.id} · {row.due}
                    </small>
                  </span>
                  <StateBadge
                    kind={row.status === "En cours" ? "blue" : "neutral"}
                  >
                    {row.status}
                  </StateBadge>
                </button>
              ))}
            </section>
            <aside className="asset-side">
              <div className="asset-callout">
                <div className="callout-icon">
                  <CalendarMonthRounded />
                </div>
                <div>
                  <b>Préventif à venir</b>
                  <p>Inspection hebdomadaire prévue le 18 octobre.</p>
                  <Button size="small">Voir le plan</Button>
                </div>
              </div>
              <div className="asset-callout muted-callout">
                <div className="callout-icon">
                  <AccessTimeRounded />
                </div>
                <div>
                  <b>Fiabilité</b>
                  <p>
                    MTBF / MTTR indisponibles : l’historique de panne validé
                    n’est pas présent dans cette démo.
                  </p>
                </div>
              </div>
              <div className="asset-id-panel">
                <div className="asset-id-heading">
                  <span className="callout-icon">
                    <QrCode2Rounded />
                  </span>
                  <div>
                    <b>Identification QR</b>
                    <small>Code équipement · WEB-062</small>
                  </div>
                </div>
                <div className="asset-id-value">
                  <span>Code associé</span>
                  <code>{qrValue}</code>
                </div>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<QrCode2Rounded />}
                  onClick={() => setTagDialog("qr")}
                >
                  Générer / télécharger le QR
                </Button>
                <Divider />
                <div className="asset-id-heading">
                  <span className="callout-icon">
                    <NfcRounded />
                  </span>
                  <div>
                    <b>Identification NFC</b>
                    <small>Lecture navigateur à valider</small>
                  </div>
                </div>
                <Button
                  size="small"
                  onClick={() => {
                    setNfcCheck(null);
                    setTagDialog("nfc");
                  }}
                >
                  Voir le parcours NFC Web
                </Button>
              </div>
            </aside>
          </div>
        ) : (
          <div className="tab-placeholder">
            <div className="kpi-icon blue">
              <PrecisionManufacturingRounded />
            </div>
            <Typography variant="h3">
              {
                [
                  "Vue d’ensemble",
                  "Ordres de travail",
                  "Détails techniques",
                  "Pièces",
                  "Fichiers",
                  "Compteurs",
                  "Arrêts",
                  "Analyses",
                ][activeTab]
              }
            </Typography>
            <Typography color="text.secondary">
              Région de contenu {`WEB-06${2 + activeTab}`} pour l’équipement
              CV-04. Aucun score, relevé ni historique supplémentaire n’est
              inventé.
            </Typography>
            <Button variant="outlined">Ouvrir le panneau de section</Button>
          </div>
        )}
      </Paper>
      <Dialog
        open={tagDialog === "qr"}
        onClose={() => setTagDialog("")}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Étiquette QR · CV-04</DialogTitle>
        <DialogContent>
          <div className="qr-preview">
            <QRCodeSVG
              id="prototype-asset-qr"
              value={qrValue}
              size={192}
              level="H"
            />
          </div>
          <Typography align="center" fontWeight={700}>
            {qrValue}
          </Typography>
          <Typography
            align="center"
            color="text.secondary"
            variant="body2"
            sx={{ mt: 1 }}
          >
            Le QR contient uniquement le code-barres associé. Le nom, le site et
            les données de maintenance ne sont pas encodés.
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            Démonstration locale : le code est fictif et aucun équipement QPM
            n’est modifié.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTagDialog("")}>Fermer</Button>
          <Button
            variant="contained"
            startIcon={<DownloadRounded />}
            onClick={downloadAssetQr}
          >
            Télécharger SVG
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={tagDialog === "nfc"}
        onClose={closeNfcDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Lecture NFC depuis le Web</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Web NFC est limité aux navigateurs et appareils compatibles,
            généralement Chrome sur Android en contexte HTTPS. Le navigateur
            lit les tags NDEF; il ne garantit pas le même identifiant que le
            lecteur NFC natif QPM.
          </Alert>
          <Typography variant="body2" paragraph>
            Touchez « Démarrer la lecture », autorisez l’accès si demandé, puis
            approchez un tag NDEF du téléphone. Cette maquette affiche
            l’identifiant lu, mais ne l’envoie pas à l’API et ne modifie aucun
            équipement.
          </Typography>
          <Typography variant="body2" paragraph>
            L’application mobile transmet le <code>tag.id</code> à l’API NFC.
            Le Web NFC peut fournir <code>serialNumber</code> ou un contenu NDEF :
            leur équivalence avec <code>nfcId</code> doit être vérifiée avant
            toute connexion à l’API. Le QR reste le parcours Web de référence.
          </Typography>
          {nfcReading && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Lecture en cours. Approchez le tag NFC du téléphone.
            </Alert>
          )}
          {!!nfcResult && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Valeur lue (prototype) : <code>{nfcResult}</code>
            </Alert>
          )}
          {!!nfcError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {nfcError}
            </Alert>
          )}
          {nfcCheck && (
            <Alert
              severity={
                nfcCheck.supported && nfcCheck.secure ? "success" : "info"
              }
            >
              {nfcCheck.supported && nfcCheck.secure
                ? "Web NFC est exposé et le contexte est sécurisé. Le matériel, l’autorisation et la compatibilité de l’identifiant restent à vérifier."
                : "Web NFC n’est pas disponible dans cette session. Utilisez le QR dans le Web ou le scan NFC natif QPM sur Android."}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          {nfcReading ? (
            <Button onClick={cancelNfcRead}>Arrêter la lecture</Button>
          ) : (
            <Button onClick={closeNfcDialog}>Fermer</Button>
          )}
          <Button
            variant="contained"
            startIcon={<NfcRounded />}
            onClick={startNfcRead}
            disabled={nfcReading}
          >
            {nfcReading ? "Lecture en cours…" : "Démarrer la lecture NFC"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
function Info({ label, value }) {
  return (
    <div className="asset-info">
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}

function Appearance({ appearance, setAppearance }) {
  return (
    <>
      <PageIntro
        eyebrow="PRÉFÉRENCES PERSONNELLES"
        title="Apparence"
        subtitle="Prototype de préférence utilisateur · non synchronisé au profil QPM."
      />
      <div className="appearance-layout">
        <Paper className="panel appearance-card" elevation={0}>
          <SectionTitle
            title="Mode d’affichage"
            subtitle="Appliqué immédiatement dans ce prototype. "
          />
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={appearance}
            onChange={(_, v) => v && setAppearance(v)}
            className="appearance-options"
          >
            <ToggleButton value="light">
              <LightModeRounded />
              Clair
            </ToggleButton>
            <ToggleButton value="dark">
              <DarkModeRounded />
              Sombre
            </ToggleButton>
            <ToggleButton value="system">
              <DevicesRounded />
              Système
            </ToggleButton>
          </ToggleButtonGroup>
          <div className="appearance-note">
            <DevicesRounded />
            <span>
              <b>Mode Système</b>
              <small>
                Suit la préférence clair/sombre du navigateur et se met à jour
                sans rechargement.
              </small>
            </span>
          </div>
        </Paper>
        <Paper className="panel appearance-card" elevation={0}>
          <SectionTitle
            title="Identité de l’entreprise"
            subtitle="Gérée par la configuration de société, distincte du choix Clair/Sombre."
          />
          <div className="company-brand-row">
            <div className="company-swatch" />
            <div>
              <b>Konakry Mining</b>
              <small>Accent société · bleu QPM approuvé</small>
            </div>
            <Chip size="small" label="#4B5FE8" variant="outlined" />
          </div>
          <Alert severity="info" sx={{ mt: 2 }}>
            Le thème personnel ne modifie pas le logo, l’identité ou les
            couleurs d’état configurées pour l’entreprise.
          </Alert>
        </Paper>
        <Paper className="panel appearance-preview" elevation={0}>
          <SectionTitle
            title="Aperçu des composants"
            subtitle="Échantillon des surfaces avec le thème actif."
          />
          <div className="preview-tile">
            <div>
              <b>WO-2026-01842</b>
              <small>Remplacer le roulement CV-04</small>
            </div>
            <div>
              <StateBadge kind="urgent">Urgente</StateBadge>
              <StateBadge kind="blue">En cours</StateBadge>
            </div>
          </div>
          <div className="preview-actions">
            <Button variant="contained">Action principale</Button>
            <Button variant="outlined">Secondaire</Button>
            <Button color="error">Critique</Button>
          </div>
        </Paper>
      </div>
    </>
  );
}

function ComponentGallery() {
  return (
    <>
      <PageIntro
        eyebrow="SYSTÈME QPM · GALERIE"
        title="Recettes de composants"
        subtitle="Assemblages MUI du prototype; aucune nouvelle bibliothèque."
      />
      <div className="gallery-grid">
        <Paper className="panel" elevation={0}>
          <SectionTitle title="Statut & priorité" />
          <Stack direction="row" flexWrap="wrap" gap={1}>
            <StateBadge kind="neutral">Ouvert</StateBadge>
            <StateBadge kind="blue">En cours</StateBadge>
            <StateBadge kind="high">En attente</StateBadge>
            <StateBadge kind="green">Terminé</StateBadge>
            <StateBadge kind="urgent">En retard</StateBadge>
            <StateBadge kind="urgent">Priorité urgente</StateBadge>
          </Stack>
          <Typography className="muted gallery-caption">
            Statut et priorité restent distincts; les termes accompagnent
            toujours la couleur.
          </Typography>
        </Paper>
        <Paper className="panel" elevation={0}>
          <SectionTitle title="États de page" />
          <Stack gap={1}>
            <Alert severity="success">
              Enregistrement de démonstration réussi.
            </Alert>
            <Alert severity="warning">
              Aucune donnée fictive ne remplace un résultat réel.
            </Alert>
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small">
                  Réessayer
                </Button>
              }
            >
              Erreur de chargement simulée.
            </Alert>
            <Alert severity="info">
              Une permission absente affiche un état d’accès refusé; le
              service/API demeure l’autorité.
            </Alert>
            <Alert severity="error">
              Accès refusé · le rôle courant ne peut pas consulter cet
              enregistrement.
            </Alert>
          </Stack>
        </Paper>
        <Paper className="panel" elevation={0}>
          <SectionTitle title="Formulaire & densité" />
          <Stack gap={2}>
            <TextField
              label="Numéro d’ordre"
              size="small"
              defaultValue="WO-2026-01842"
            />
            <FormControl size="small">
              <InputLabel>Équipe</InputLabel>
              <Select label="Équipe" defaultValue="mechanical">
                <MenuItem value="mechanical">Équipe mécanique</MenuItem>
                <MenuItem value="electrical">Équipe électrique</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained">Enregistrer · démo</Button>
          </Stack>
        </Paper>
        <Paper className="panel" elevation={0}>
          <SectionTitle title="Feedback asynchrone" />
          <Stack gap={2}>
            <LinearProgress />
            <Alert severity="info">
              Chargement des ordres… · état de démonstration
            </Alert>
            <div className="empty-state">
              <InboxRounded />
              <b>Aucun résultat trouvé</b>
              <span>Essayez une autre recherche ou effacez les filtres.</span>
            </div>
          </Stack>
        </Paper>
      </div>
    </>
  );
}
