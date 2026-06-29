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
        if (!sdk) console.warn('[YandexSDK] SDK unavailable; running with local fallbacks.');
        return this;
      })
      .catch((error) => {
        console.warn('[YandexSDK] Initialization failed; running without platform services.', error);
        return this;
      });
    return this.initPromise;
  }

  async showRewarded(reason: string, onReward: () => void): Promise<void> {
    await this.init();
    let granted = false;
    try {
      await this.ysdk?.adv?.showRewardedVideo?.({ callbacks: { onRewarded: () => { granted = true; onReward(); } } });
      if (!this.ysdk || !granted) onReward();
    } catch (error) {
      console.warn(`[YandexSDK] Rewarded ad failed for ${reason}; granting fallback reward.`, error);
      onReward();
    }
  }

  async showInterstitial(): Promise<void> {
    await this.init();
    try {
      await this.ysdk?.adv?.showFullscreenAdv?.({});
    } catch (error) {
      console.warn('[YandexSDK] Interstitial unavailable.', error);
    }
  }

  async save(data: unknown): Promise<void> {
    await this.init();
    try {
      const player = await this.ysdk?.getPlayer?.();
      await player?.setData?.(data);
    } catch (error) {
      console.warn('[YandexSDK] Cloud save unavailable.', error);
    }
  }

  private loadSdk(): Promise<void> {
    if (window.YaGames) return Promise.resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    if (existing) return this.waitForExistingScript(existing);
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        console.warn(`[YandexSDK] Could not load ${SDK_URL}.`);
        resolve();
      };
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
