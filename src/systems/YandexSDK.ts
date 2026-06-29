declare global {
  interface Window {
    YaGames?: { init: () => Promise<any> };
  }
}

const SDK_URL = 'https://yandex.ru/games/sdk/v2';

export class YandexSDK {
  private ysdk: any;
  private initPromise?: Promise<this>;

  init(): Promise<this> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.loadSdk()
      .then(() => window.YaGames?.init?.())
      .then((sdk) => {
        this.ysdk = sdk;
        return this;
      })
      .catch(() => this);
    return this.initPromise;
  }

  async showRewarded(reason: string, onReward: () => void): Promise<void> {
    await this.init();
    let granted = false;
    try {
      await this.ysdk?.adv?.showRewardedVideo?.({ callbacks: { onRewarded: () => { granted = true; onReward(); } } });
      if (!this.ysdk || !granted) onReward();
    } catch {
      onReward();
    }
  }

  async showInterstitial(): Promise<void> {
    await this.init();
    try {
      await this.ysdk?.adv?.showFullscreenAdv?.({});
    } catch {
      // Optional platform ad unavailable; continue silently for web builds.
    }
  }

  async save(data: unknown): Promise<void> {
    await this.init();
    try {
      const player = await this.ysdk?.getPlayer?.();
      await player?.setData?.(data);
    } catch {
      // Optional cloud save unavailable; local save remains authoritative.
    }
  }

  private loadSdk(): Promise<void> {
    if (window.YaGames) return Promise.resolve();
    if (!/yandex\./i.test(window.location.hostname)) return Promise.resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    if (existing) return this.waitForExistingScript(existing);
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.appendChild(script);
      window.setTimeout(resolve, 2500);
    });
  }

  private waitForExistingScript(script: HTMLScriptElement): Promise<void> {
    if (window.YaGames) return Promise.resolve();
    return new Promise((resolve) => {
      script.addEventListener('load', () => resolve(), { once: true });
      script.addEventListener('error', () => resolve(), { once: true });
      window.setTimeout(resolve, 2500);
    });
  }
}
