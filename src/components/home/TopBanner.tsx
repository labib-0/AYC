import TopBannerView from "@/components/home/TopBannerView";
import { DEFAULT_TOP_BANNER, TopBannerConfig } from "@/config/banner";
import { homepageService } from "@/services/homepage.service";

export interface TopBannerProps {
  initialBanner?: TopBannerConfig;
}

/**
 * Server Component for Homepage Hero / Promotional Top Banner.
 *
 * Pre-fetches the authoritative hero banner configuration on the server during SSR,
 * guaranteeing the primary hero image URL is immediately present in initial HTML
 * and preloaded in the document head without client-side discovery roundtrips.
 */
export default async function TopBanner({ initialBanner }: TopBannerProps = {}) {
  let banner = initialBanner;

  if (!banner) {
    try {
      const data = await homepageService.getStorefrontHomepageData();
      if (data?.banner) {
        banner = homepageService.bannerModelToTopBannerConfig(data.banner);
      } else {
        banner = DEFAULT_TOP_BANNER;
      }
    } catch {
      banner = DEFAULT_TOP_BANNER;
    }
  }

  return <TopBannerView initialBanner={banner} />;
}
