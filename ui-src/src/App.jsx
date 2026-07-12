import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Field,
  Input,
  ProgressBar,
  Spinner,
  Text,
  Title1,
  Title2,
} from '@fluentui/react-components';
import {
  ArrowClockwise24Regular,
  ArrowDownload24Regular,
  CloudArrowUp24Regular,
  Database24Regular,
  Dismiss24Regular,
  MusicNote224Regular,
  Play24Filled,
} from '@fluentui/react-icons';

const bridge = window.osuMaps;

export default function App() {
  const [status, setStatus] = useState({
    total: null,
    installed: null,
    missing: null,
    scanError: null,
  });
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('Ready');
  const [events, setEvents] = useState(new Map());
  const [provider, setProvider] = useState('https://api.rai.moe');
  const [concurrency, setConcurrency] = useState('3');
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [importAfter, setImportAfter] = useState(true);
  const [message, setMessage] = useState('');

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
      setStatus(await bridge.status());
    } catch (error) {
      setMessage(String(error));
    }
  }

  useEffect(() => {
    if (!bridge) return undefined;
    const unsubscribe = bridge.onProgress((event) => {
      if (event.type === 'import') {
        setStage(`Importing ${event.index} of ${event.total}`);
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
          The Electron preload script is missing. Run <code>git pull</code>,{' '}
          <code>pnpm install</code>, then <code>pnpm gui</code>.
        </Text>
      </div>
    );
  }

  async function sync(push) {
    setBusy(true);
    setStage('Syncing collection');
    setMessage('');
    try {
      const result = await bridge.sync(push);
      setMessage(`Synced ${result.synced} maps; added ${result.added}.`);
      await refresh();
    } catch (error) {
      setMessage(String(error));
    } finally {
      setBusy(false);
      setStage('Ready');
    }
  }

  async function restore() {
    setBusy(true);
    setEvents(new Map());
    setStage('Downloading beatmaps');
    setMessage('');
    try {
      const result = await bridge.restore({
        provider,
        concurrency: Number(concurrency),
        onlyMissing,
        importAfter,
      });
      setMessage(
        `Restore complete: ${result.downloaded} downloaded, ${result.imported} handed to lazer.`,
      );
      setStage('Complete');
      await refresh();
    } catch (error) {
      setMessage(String(error));
      setStage('Stopped');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <img src="../assets/app-icon.svg" />
          <div>
            <Text weight="semibold">osu! Maps</Text>
            <Text size={200}>Library manager</Text>
          </div>
        </div>
        <nav>
          <div className="nav-active">
            <Database24Regular />
            Library
          </div>
          <div>
            <ArrowDownload24Regular />
            Restore
          </div>
        </nav>
        <Text className="aside-note" size={200}>
          Close osu!lazer before scanning or syncing. The manager launches it for import.
        </Text>
      </aside>
      <main>
        <header>
          <div>
            <Title1>Beatmap library</Title1>
            <Text>Keep your collection portable and restore it without opening browser tabs.</Text>
          </div>
          <Button icon={<ArrowClockwise24Regular />} onClick={refresh}>
            Refresh
          </Button>
        </header>
        {status.scanError && <div className="notice">{status.scanError}</div>}
        {message && <div className="notice accent">{message}</div>}
        <section className="metrics">
          <Metric label="Tracked" value={status.total} />
          <Metric label="Installed" value={status.installed} />
          <Metric label="Missing" value={status.missing} />
          <Metric label="Current task" value={busy ? stage : 'Idle'} compact />
        </section>
        <div className="columns">
          <Card className="card">
            <div className="card-title">
              <div>
                <Title2>Sync collection</Title2>
                <Text>
                  Pull the in-game <code>repo</code> collection into this repository.
                </Text>
              </div>
              <CloudArrowUp24Regular />
            </div>
            <div className="button-row">
              <Button disabled={busy} onClick={() => sync(false)}>
                Sync locally
              </Button>
              <Button appearance="primary" disabled={busy} onClick={() => sync(true)}>
                Sync and push
              </Button>
            </div>
          </Card>
          <Card className="card restore-card">
            <div className="card-title">
              <div>
                <Title2>Restore missing maps</Title2>
                <Text>Download validated archives and import them into lazer.</Text>
              </div>
              <MusicNote224Regular />
            </div>
            <div className="form-grid">
              <Field label="Mirror provider">
                <Input value={provider} onChange={(_, d) => setProvider(d.value)} />
              </Field>
              <Field label="Concurrent downloads">
                <Input
                  type="number"
                  min="1"
                  max="8"
                  value={concurrency}
                  onChange={(_, d) => setConcurrency(d.value)}
                />
              </Field>
            </div>
            <div className="checks">
              <Checkbox
                checked={onlyMissing}
                onChange={(_, d) => setOnlyMissing(Boolean(d.checked))}
                label="Only missing maps"
              />
              <Checkbox
                checked={importAfter}
                onChange={(_, d) => setImportAfter(Boolean(d.checked))}
                label="Import after download"
              />
            </div>
            <div className="button-row">
              <Button icon={<Dismiss24Regular />} disabled={!busy} onClick={() => bridge.cancel()}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                icon={<Play24Filled />}
                disabled={busy}
                onClick={restore}
              >
                Download and import
              </Button>
            </div>
          </Card>
        </div>
        <Card className="activity-card">
          <div className="activity-head">
            <div>
              <Title2>Activity</Title2>
              <Text>{busy ? stage : 'Download and import progress appears here.'}</Text>
            </div>
            {busy && <Spinner size="tiny" />}
          </div>
          <ProgressBar value={progress} />
          <div className="event-list">
            {events.size === 0 ? (
              <div className="empty">No active downloads</div>
            ) : (
              [...events.values()].map((event) => (
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
      </main>
    </div>
  );
}

function Metric({ label, value, compact = false }) {
  return (
    <Card className="metric">
      <Text size={200}>{label}</Text>
      <Text className={compact ? 'metric-compact' : 'metric-value'} weight="semibold">
        {value ?? '—'}
      </Text>
    </Card>
  );
}
