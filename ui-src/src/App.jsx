import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dropdown,
  Field,
  Input,
  Option,
  ProgressBar,
  Spinner,
  Text,
  Toast,
  ToastBody,
  Toaster,
  ToastTitle,
  Title1,
  Title2,
  useToastController,
} from '@fluentui/react-components';
import {
  ArrowClockwise24Regular,
  ArrowDownload24Regular,
  CloudArrowUp24Regular,
  Database24Regular,
  Dismiss24Regular,
  FolderOpen24Regular,
  MusicNote224Regular,
  Play24Filled,
  Settings24Regular,
} from '@fluentui/react-icons';

const bridge = window.osuMaps;
const toasterId = 'osu-maps-toaster';

export default function App() {
  const { dispatchToast } = useToastController(toasterId);
  const [page, setPage] = useState('library');
  const [status, setStatus] = useState({
    total: null,
    installed: null,
    missing: null,
    scanError: null,
    localCollections: [],
    remoteCollections: [],
    libraryPath: '',
    isGitRepository: false,
    gitBranch: null,
  });
  const [selectedLocal, setSelectedLocal] = useState([]);
  const [remoteCollection, setRemoteCollection] = useState('all');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('Ready');
  const [events, setEvents] = useState(new Map());
  const [provider, setProvider] = useState('auto');
  const [concurrency, setConcurrency] = useState('3');
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [importAfter, setImportAfter] = useState(true);

  function notify(title, body, intent = 'info') {
    dispatchToast(
      <Toast>
        <ToastTitle>{title}</ToastTitle>
        {body && <ToastBody>{body}</ToastBody>}
      </Toast>,
      { intent, timeout: intent === 'error' ? 8000 : 5000 },
    );
  }

  const completed = useMemo(
    () =>
      [...events.values()].filter((event) =>
        ['complete', 'skipped', 'failed'].includes(event.state),
      ).length,
    [events],
  );
  const expected = onlyMissing ? (status.missing ?? status.total ?? 0) : (status.total ?? 0);
  const progress = expected ? Math.min(1, completed / expected) : 0;

  async function refresh() {
    if (!bridge) return;
    try {
      const next = await bridge.status();
      setStatus(next);
      setSelectedLocal((current) =>
        current.length ? current : next.localCollections.map((collection) => collection.name),
      );
      if (next.scanError) notify('Could not scan osu!lazer', next.scanError, 'warning');
    } catch (error) {
      notify('Refresh failed', errorMessage(error), 'error');
    }
  }

  useEffect(() => {
    if (!bridge) return undefined;
    const unsubscribe = bridge.onProgress((event) => {
      if (event.type === 'opening') {
        setStage('Opening osu!lazer');
        return;
      }
      if (event.type === 'import') {
        setStage(`Opening osu!lazer · ${event.index} of ${event.total}`);
        return;
      }
      setEvents((current) => new Map(current).set(event.id, event));
    });
    void refresh();
    return unsubscribe;
  }, []);

  if (!bridge) {
    return (
      <div className="fatal">
        <Dismiss24Regular />
        <Title2>Desktop bridge failed to load</Title2>
        <Text>
          Run <code>git pull</code>, <code>pnpm install</code>, then <code>pnpm gui</code>.
        </Text>
      </div>
    );
  }

  async function sync(push) {
    if (!selectedLocal.length) {
      notify('No collections selected', 'Select at least one local collection first.', 'warning');
      return;
    }
    setBusy(true);
    setStage('Syncing collections');
    try {
      const result = await bridge.sync({ names: selectedLocal, push });
      notify(
        push ? 'Synced and pushed' : 'Synced locally',
        push
          ? `${result.synced} maps synced. origin/${result.pushResult.branch} verified at ${result.pushResult.commit}.`
          : `${result.synced} maps synced; ${result.added} added.`,
        'success',
      );
      await refresh();
    } catch (error) {
      notify('Sync failed', errorMessage(error), 'error');
    } finally {
      setBusy(false);
      setStage('Ready');
    }
  }

  async function restore() {
    setBusy(true);
    setEvents(new Map());
    setStage('Downloading beatmaps');
    try {
      const result = await bridge.restore({
        provider,
        concurrency: Number(concurrency),
        collection: remoteCollection === 'all' ? undefined : remoteCollection,
        onlyMissing,
        importAfter,
      });
      notify(
        result.nothingToDo === 'already-installed' ? 'Everything is installed' : 'Restore complete',
        result.nothingToDo === 'already-installed'
          ? 'Everything in the selected library is already installed.'
          : `${result.downloaded} downloaded; ${result.imported} handed to osu!lazer.`,
        'success',
      );
      setStage('Complete');
      await refresh();
    } catch (error) {
      notify('Restore failed', errorMessage(error), 'error');
      setStage('Stopped');
    } finally {
      setBusy(false);
    }
  }

  function toggleCollection(name, checked) {
    setSelectedLocal((current) =>
      checked ? [...new Set([...current, name])] : current.filter((item) => item !== name),
    );
  }

  return (
    <div className="shell">
      <Toaster toasterId={toasterId} position="top-end" pauseOnHover />
      <aside>
        <div className="brand">
          <img src="../assets/app-icon.svg" />
          <div>
            <Text weight="semibold">osu! Maps</Text>
            <Text size={200}>Library manager</Text>
          </div>
        </div>
        <nav>
          <NavButton
            active={page === 'library'}
            icon={<Database24Regular />}
            onClick={() => setPage('library')}
          >
            Library
          </NavButton>
          <NavButton
            active={page === 'collections'}
            icon={<MusicNote224Regular />}
            onClick={() => setPage('collections')}
          >
            Collections
          </NavButton>
          <NavButton
            active={page === 'restore'}
            icon={<ArrowDownload24Regular />}
            onClick={() => setPage('restore')}
          >
            Restore
          </NavButton>
          <NavButton
            active={page === 'settings'}
            icon={<Settings24Regular />}
            onClick={() => setPage('settings')}
          >
            Settings
          </NavButton>
        </nav>
        <Text className="aside-note" size={200}>
          Close osu!lazer before scanning or syncing. The manager launches it for import.
        </Text>
      </aside>
      <main>
        <header>
          <div>
            <Title1>{pageTitle(page)}</Title1>
            <Text>{pageDescription(page)}</Text>
          </div>
          <Button icon={<ArrowClockwise24Regular />} onClick={refresh}>
            Refresh
          </Button>
        </header>
        {page === 'library' && <LibraryPage status={status} busy={busy} setPage={setPage} />}
        {page === 'collections' && (
          <CollectionsPage
            collections={status.localCollections}
            selected={selectedLocal}
            busy={busy}
            toggle={toggleCollection}
            sync={sync}
            isGitRepository={status.isGitRepository}
          />
        )}
        {page === 'restore' && (
          <RestorePage
            busy={busy}
            stage={stage}
            events={events}
            progress={progress}
            provider={provider}
            setProvider={setProvider}
            concurrency={concurrency}
            setConcurrency={setConcurrency}
            onlyMissing={onlyMissing}
            setOnlyMissing={setOnlyMissing}
            importAfter={importAfter}
            setImportAfter={setImportAfter}
            remoteCollections={status.remoteCollections}
            remoteCollection={remoteCollection}
            setRemoteCollection={setRemoteCollection}
            restore={restore}
          />
        )}
        {page === 'settings' && <SettingsPage status={status} refresh={refresh} />}
      </main>
    </div>
  );
}

function LibraryPage({ status, busy, setPage }) {
  return (
    <>
      <section className="metrics">
        <Metric label="Tracked" value={status.total} />
        <Metric label="Installed" value={status.installed} />
        <Metric label="Missing" value={status.missing} />
        <Metric label="Collections" value={status.remoteCollections.length} />
      </section>
      <div className="columns">
        <Card className="card feature-card">
          <CloudArrowUp24Regular />
          <Title2>Sync game collections</Title2>
          <Text>
            Choose one or more collections detected in lazer and store their membership remotely.
          </Text>
          <Button appearance="primary" disabled={busy} onClick={() => setPage('collections')}>
            Manage collections
          </Button>
        </Card>
        <Card className="card feature-card">
          <ArrowDownload24Regular />
          <Title2>Restore your library</Title2>
          <Text>
            Restore all maps or select a remote collection, with validated provider fallback.
          </Text>
          <Button appearance="primary" disabled={busy} onClick={() => setPage('restore')}>
            Open restore
          </Button>
        </Card>
      </div>
    </>
  );
}

function CollectionsPage({ collections, selected, busy, toggle, sync, isGitRepository }) {
  return (
    <Card className="card page-card">
      <div className="section-heading">
        <div>
          <Title2>Detected in osu!lazer</Title2>
          <Text>Select collections to sync independently.</Text>
        </div>
        <Badge appearance="tint">{collections.length} found</Badge>
      </div>
      <div className="collection-grid">
        {collections.length ? (
          collections.map((collection) => (
            <label className="collection-item" key={collection.name}>
              <Checkbox
                checked={selected.includes(collection.name)}
                onChange={(_, data) => toggle(collection.name, Boolean(data.checked))}
              />
              <div>
                <Text weight="semibold">{collection.name}</Text>
                <Text size={200}>
                  {collection.beatmapsetCount} beatmapsets · {collection.difficultyCount}{' '}
                  difficulties
                </Text>
              </div>
            </label>
          ))
        ) : (
          <div className="empty">No collections detected. Close osu!lazer and refresh.</div>
        )}
      </div>
      <div className="button-row">
        <Button disabled={busy || !selected.length} onClick={() => sync(false)}>
          Sync locally
        </Button>
        <Button
          appearance="primary"
          disabled={busy || !selected.length || !isGitRepository}
          title={
            isGitRepository
              ? 'Commit and push selected collections'
              : 'Connect a Git repository in Settings first'
          }
          onClick={() => sync(true)}
        >
          Sync and push
        </Button>
      </div>
      {!isGitRepository && (
        <Text className="inline-help" size={200}>
          Sync locally is available now. To push, connect a GitHub repository in Settings.
        </Text>
      )}
    </Card>
  );
}

function RestorePage(props) {
  return (
    <>
      <Card className="card page-card">
        <div className="section-heading">
          <div>
            <Title2>Restore options</Title2>
            <Text>Auto provider tries rai.moe, Nerinyan, then Catboy with archive validation.</Text>
          </div>
          <Play24Filled />
        </div>
        <div className="form-grid three">
          <Field label="Remote collection">
            <Dropdown
              value={props.remoteCollection === 'all' ? 'All collections' : props.remoteCollection}
              selectedOptions={[props.remoteCollection]}
              onOptionSelect={(_, data) => props.setRemoteCollection(data.optionValue)}
            >
              <Option value="all">All collections</Option>
              {props.remoteCollections.map((name) => (
                <Option key={name} value={name}>
                  {name}
                </Option>
              ))}
            </Dropdown>
          </Field>
          <Field label="Download provider">
            <Dropdown
              value={providerLabel(props.provider)}
              selectedOptions={[props.provider]}
              onOptionSelect={(_, data) => props.setProvider(data.optionValue)}
            >
              <Option value="auto">Auto fallback</Option>
              <Option value="https://api.rai.moe">rai.moe only</Option>
              <Option value="https://api.nerinyan.moe">Nerinyan only</Option>
              <Option value="https://catboy.best">Catboy only</Option>
            </Dropdown>
          </Field>
          <Field label="Concurrent downloads">
            <Input
              type="number"
              min="1"
              max="8"
              value={props.concurrency}
              onChange={(_, data) => props.setConcurrency(data.value)}
            />
          </Field>
        </div>
        <div className="checks">
          <Checkbox
            checked={props.onlyMissing}
            onChange={(_, data) => props.setOnlyMissing(Boolean(data.checked))}
            label="Only missing maps"
          />
          <Checkbox
            checked={props.importAfter}
            onChange={(_, data) => props.setImportAfter(Boolean(data.checked))}
            label="Import after download"
          />
        </div>
        <div className="button-row">
          <Button
            icon={<Dismiss24Regular />}
            disabled={!props.busy}
            onClick={() => bridge.cancel()}
          >
            Cancel
          </Button>
          <Button
            appearance="primary"
            icon={<Play24Filled />}
            disabled={props.busy}
            onClick={props.restore}
          >
            Download and import
          </Button>
        </div>
      </Card>
      <Card className="activity-card">
        <div className="activity-head">
          <div>
            <Title2>Activity</Title2>
            <Text>{props.busy ? props.stage : 'Download and import progress appears here.'}</Text>
          </div>
          {props.busy && <Spinner size="tiny" />}
        </div>
        <ProgressBar value={props.progress} />
        <div className="event-list">
          {props.events.size === 0 ? (
            <div className="empty">No active downloads</div>
          ) : (
            [...props.events.values()].map((event) => (
              <div className="event" key={event.id}>
                <div>
                  <Text weight="semibold">
                    {event.artist} — {event.title}
                  </Text>
                  <Text size={200}>
                    Beatmapset {event.id}
                    {event.error ? ` · ${event.error}` : ''}
                  </Text>
                </div>
                <Badge
                  appearance="tint"
                  color={
                    event.state === 'failed'
                      ? 'danger'
                      : event.state === 'complete'
                        ? 'success'
                        : 'informative'
                  }
                >
                  {event.state}
                </Badge>
              </div>
            ))
          )}
        </div>
      </Card>
    </>
  );
}

function SettingsPage({ status, refresh }) {
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [connecting, setConnecting] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');

  async function choose() {
    const selected = await bridge.selectLibrary();
    if (selected) await refresh();
  }
  async function connect() {
    setConnecting(true);
    setConnectionMessage('');
    try {
      const folder = await bridge.connectRepository({ url: repositoryUrl, branch });
      setConnectionMessage(`Connected ${branch} at ${folder}`);
      await refresh();
    } catch (error) {
      setConnectionMessage(errorMessage(error));
    } finally {
      setConnecting(false);
    }
  }
  return (
    <div className="settings-stack">
      <Card className="card page-card">
        <div className="section-heading">
          <div>
            <Title2>Connect GitHub repository</Title2>
            <Text>
              Fork riandredev/osu-maps-manager first, then connect your fork so syncs are pushed to
              your own account. One repository stores all of your collections.
            </Text>
          </div>
          <CloudArrowUp24Regular />
        </div>
        <div className="form-grid repository-grid">
          <Field label="Repository URL">
            <Input
              value={repositoryUrl}
              placeholder="https://github.com/YOUR_USERNAME/osu-maps-manager.git"
              onChange={(_, data) => setRepositoryUrl(data.value)}
            />
          </Field>
          <Field label="Branch">
            <Input value={branch} onChange={(_, data) => setBranch(data.value)} />
          </Field>
        </div>
        {connectionMessage && <Text className="connection-message">{connectionMessage}</Text>}
        <div className="button-row">
          <Button
            appearance="primary"
            icon={<CloudArrowUp24Regular />}
            disabled={connecting}
            onClick={connect}
          >
            {connecting ? 'Connecting…' : 'Connect repository'}
          </Button>
        </div>
      </Card>
      <Card className="card page-card compact-card">
        <div className="section-heading">
          <div>
            <Title2>Library storage</Title2>
            <Text>Choose an existing local folder instead of cloning a repository.</Text>
          </div>
          <FolderOpen24Regular />
        </div>
        <Field label="Current library folder">
          <Input readOnly value={status.libraryPath || 'Loading…'} />
        </Field>
        <div className="library-state">
          <Badge appearance="tint" color={status.isGitRepository ? 'success' : 'warning'}>
            {status.isGitRepository
              ? `Git · ${status.gitBranch || 'branch unknown'}`
              : 'Local only'}
          </Badge>
        </div>
        <div className="button-row">
          <Button icon={<FolderOpen24Regular />} onClick={choose}>
            Choose existing folder
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <Card className="metric">
      <Text size={200}>{label}</Text>
      <Text className="metric-value" weight="semibold">
        {value ?? '—'}
      </Text>
    </Card>
  );
}
function NavButton({ active, icon, children, onClick }) {
  return (
    <button className={active ? 'nav-active' : ''} onClick={onClick}>
      {icon}
      {children}
    </button>
  );
}
function pageTitle(page) {
  return {
    library: 'Beatmap library',
    collections: 'Collections',
    restore: 'Restore',
    settings: 'Settings',
  }[page];
}
function pageDescription(page) {
  return {
    library: 'A portable overview of your tracked beatmaps.',
    collections: 'Detect and sync multiple lazer collections independently.',
    restore: 'Download all maps or restore one remote collection.',
    settings: 'Configure writable library storage and repository integration.',
  }[page];
}
function providerLabel(provider) {
  return (
    {
      auto: 'Auto fallback',
      'https://api.rai.moe': 'rai.moe only',
      'https://api.nerinyan.moe': 'Nerinyan only',
      'https://catboy.best': 'Catboy only',
    }[provider] || provider
  );
}

function errorMessage(error) {
  return String(error)
    .replace(/^Error:\s*/i, '')
    .replace(/^Error invoking remote method '[^']+':\s*Error:\s*/i, '');
}
