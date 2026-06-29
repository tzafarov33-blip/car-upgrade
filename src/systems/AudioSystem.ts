export class AudioSystem {
  private context?: AudioContext;
  private enabled = true;

  unlock(): void {
    if (!this.context) this.context = new AudioContext();
  }

  play(kind: 'cash' | 'tool' | 'engine' | 'reward' | 'click'): void {
    if (!this.enabled) return;
    this.unlock();
    const ctx = this.context;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const freq = { cash: 880, tool: 190, engine: 90, reward: 1040, click: 520 }[kind];
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(45, freq * 0.55), now + 0.16);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(kind === 'engine' ? 0.06 : 0.035, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  setMuted(muted: boolean): void {
    this.enabled = !muted;
  }
}
