declare global {
  interface Window {
    YaGames?: { init: () => Promise<any> };
  }
}

export class YandexSDK {
  private ysdk: any;

  async init(): Promise<this> {
    if (window.YaGames) this.ysdk = await window.YaGames.init();
    return this;
  }

  async showRewarded(reason: string, onReward: () => void): Promise<void> {
    let granted = false;
    try {
      await this.ysdk?.adv?.showRewardedVideo?.({ callbacks: { onRewarded: () => { granted = true; onReward(); } } });
      if (!this.ysdk || !granted) onReward();
    } catch {
      onReward();
    }
    console.info('rewarded-ad', reason);
  }

  async showInterstitial(): Promise<void> {
    try {
      await this.ysdk?.adv?.showFullscreenAdv?.({});
    } catch {
      console.info('interstitial unavailable');
    }
  }

  async save(data: unknown): Promise<void> {
    try {
      const player = await this.ysdk?.getPlayer?.();
      await player?.setData?.(data);
    } catch {
      console.info('cloud save unavailable');
    }
  }
}
