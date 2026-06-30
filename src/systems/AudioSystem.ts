type SoundKind = 'cash' | 'tool' | 'engine' | 'reward' | 'click' | 'door' | 'dust' | 'upgrade' | 'whoosh' | 'error';

export class AudioSystem {
  private context?: AudioContext;
  private enabled = true;
  private ambientGain?: GainNode;
  private musicGain?: GainNode;
  private ambientNodes: Array<OscillatorNode | AudioBufferSourceNode> = [];
  private musicTimer?: number;
  private musicStep = 0;

  unlock(): void {
    if (!this.enabled) return;
    try {
      const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) { this.enabled = false; return; }
      if (!this.context) this.context = new AudioCtor();
      if (this.context.state === 'suspended') void this.context.resume();
    } catch {
      this.enabled = false;
    }
  }

  startAmbience(): void {
    if (!this.enabled || this.ambientGain) return;
    this.unlock();
    const ctx = this.context;
    if (!ctx) return;
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.ambientGain.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 1.4);
    this.ambientGain.connect(ctx.destination);

    const hum = this.loopOscillator('sawtooth', 48, 0.018);
    const fan = this.loopOscillator('triangle', 92, 0.012);
    if (hum) this.ambientNodes.push(hum);
    if (fan) this.ambientNodes.push(fan);
    this.scheduleWorkshopClank();
    this.startMusic();
  }

  startMusic(intensity = 1): void {
    if (!this.enabled || this.musicTimer) return;
    this.unlock();
    const ctx = this.context;
    if (!ctx) return;
    this.musicGain = ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.musicGain.gain.exponentialRampToValueAtTime(0.026 * intensity, ctx.currentTime + 2.2);
    this.musicGain.connect(ctx.destination);
    const notes = [110, 146.83, 164.81, 196, 220, 196, 164.81, 146.83];
    this.musicTimer = window.setInterval(() => {
      if (!this.enabled || !this.context || !this.musicGain) return;
      const note = notes[this.musicStep % notes.length] * (this.musicStep % 4 === 0 ? 0.5 : 1);
      this.tone(note, 0.16, 'triangle', 0.018, this.musicGain);
      if (this.musicStep % 4 === 2) this.tone(note * 2, 0.08, 'sine', 0.01, this.musicGain, 0.05);
      this.musicStep += 1;
    }, 420);
  }

  setMusicIntensity(level: number): void {
    if (!this.musicGain || !this.context) return;
    this.musicGain.gain.cancelScheduledValues(this.context.currentTime);
    this.musicGain.gain.linearRampToValueAtTime(0.018 + Math.min(0.025, level * 0.005), this.context.currentTime + 0.35);
  }

  play(kind: SoundKind): void {
    if (!this.enabled) return;
    this.unlock();
    const ctx = this.context;
    if (!ctx) return;
    const recipes: Record<SoundKind, [number, number, OscillatorType, number]> = {
      cash: [1180, 0.22, 'triangle', 0.055],
      tool: [240, 0.18, 'square', 0.035],
      engine: [74, 0.42, 'sawtooth', 0.075],
      reward: [1320, 0.36, 'sine', 0.065],
      click: [520, 0.07, 'triangle', 0.026],
      door: [120, 0.55, 'sawtooth', 0.07],
      dust: [80, 0.26, 'triangle', 0.025],
      upgrade: [880, 0.42, 'triangle', 0.055],
      whoosh: [340, 0.24, 'sine', 0.032],
      error: [150, 0.18, 'square', 0.03]
    };
    const [freq, duration, type, volume] = recipes[kind];
    this.tone(freq, duration, type, volume);
    if (kind === 'cash' || kind === 'reward' || kind === 'upgrade') {
      this.tone(freq * 1.5, duration * 0.8, 'sine', volume * 0.7, undefined, 0.07);
      this.tone(freq * 2, duration * 0.55, 'sine', volume * 0.45, undefined, 0.14);
    }
    if (kind === 'door' || kind === 'dust') this.noise(duration, kind === 'door' ? 0.026 : 0.018);
  }

  setMuted(muted: boolean): void {
    this.enabled = !muted;
    if (muted) this.stopLoops();
  }

  destroy(): void {
    this.stopLoops();
    this.context?.close().catch(() => {
      // Browser may reject close() for already-closing contexts; ignore during scene shutdown.
    });
    this.context = undefined;
    this.enabled = false;
  }

  private loopOscillator(type: OscillatorType, frequency: number, volume: number): OscillatorNode | undefined {
    const ctx = this.context;
    if (!ctx || !this.ambientGain) return undefined;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    osc.connect(gain).connect(this.ambientGain);
    osc.start();
    return osc;
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number, destination?: AudioNode, delay = 0): void {
    const ctx = this.context;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime + delay;
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(35, frequency * 0.58), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(destination ?? ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.04);
  }

  private noise(duration: number, volume: number): void {
    const ctx = this.context;
    if (!ctx) return;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(gain).connect(ctx.destination);
    source.start();
  }

  private scheduleWorkshopClank(): void {
    window.setTimeout(() => {
      if (!this.enabled || !this.ambientGain) return;
      this.play(Math.random() > 0.5 ? 'tool' : 'dust');
      this.scheduleWorkshopClank();
    }, 2600 + Math.random() * 4200);
  }

  private stopLoops(): void {
    for (const node of this.ambientNodes) { try { node.stop(); } catch { /* already stopped */ } }
    this.ambientNodes = [];
    this.ambientGain?.disconnect();
    this.ambientGain = undefined;
    this.musicGain?.disconnect();
    this.musicGain = undefined;
    if (this.musicTimer) window.clearInterval(this.musicTimer);
    this.musicTimer = undefined;
  }
}
