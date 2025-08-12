import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Use 'load_balancing' instead of 'least_load'; accept 'least_load' as an alias for backward compatibility
type Strategy = 'load_balancing' | 'round_robin' | 'random' | 'least_load';

const CONFIG_DIR = path.resolve(process.cwd(), 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'auto-assign.json');

async function ensureConfig(): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch {}
  try {
    await fs.access(CONFIG_FILE);
  } catch {
    // Default to 'load_balancing' (alias of least-load algorithm)
    const defaultCfg = { strategy: 'load_balancing' as Strategy };
    await fs.writeFile(CONFIG_FILE, JSON.stringify(defaultCfg, null, 2), 'utf8');
  }
}

async function readConfig(): Promise<{ strategy: Exclude<Strategy, 'least_load'> }> {
  await ensureConfig();
  const raw = await fs.readFile(CONFIG_FILE, 'utf8');
  const json = JSON.parse(raw || '{}');
  // Default strategy
  let strategy: Exclude<Strategy, 'least_load'> = 'load_balancing';
  if (json && typeof json.strategy === 'string') {
    // Map legacy 'least_load' to 'load_balancing'
    const incoming = json.strategy as Strategy;
    if (incoming === 'least_load') {
      strategy = 'load_balancing';
    } else if (['load_balancing', 'round_robin', 'random'].includes(incoming)) {
      strategy = incoming as Exclude<Strategy, 'least_load'>;
    }
  }
  return { strategy };
}

async function writeConfig(cfg: { strategy: Strategy }): Promise<void> {
  await ensureConfig();
  // Normalize to new key on disk (store 'load_balancing' instead of legacy 'least_load')
  const normalized: { strategy: Exclude<Strategy, 'least_load'> } = {
    strategy: (cfg.strategy === 'least_load' ? 'load_balancing' : cfg.strategy) as Exclude<Strategy, 'least_load'>
  };
  await fs.writeFile(CONFIG_FILE, JSON.stringify(normalized, null, 2), 'utf8');
}

export async function GET(_req: NextRequest) {
  try {
    const cfg = await readConfig();
    return NextResponse.json({ success: true, ...cfg });
  } catch (err) {
    console.error('GET auto-assign settings failed:', err);
    return NextResponse.json({ success: false, error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const val = String(body?.strategy || '').trim();
  // Accept legacy 'least_load' but prefer 'load_balancing'
  const allowed: Strategy[] = ['load_balancing', 'round_robin', 'random', 'least_load'];
  if (!allowed.includes(val as Strategy)) {
      return NextResponse.json({ success: false, error: 'Invalid strategy' }, { status: 400 });
    }
  const normalized = (val === 'least_load' ? 'load_balancing' : (val as Strategy)) as Exclude<Strategy, 'least_load'>;
  await writeConfig({ strategy: normalized });
  return NextResponse.json({ success: true, strategy: normalized });
  } catch (err) {
    console.error('PUT auto-assign settings failed:', err);
    return NextResponse.json({ success: false, error: 'Failed to save settings' }, { status: 500 });
  }
}
