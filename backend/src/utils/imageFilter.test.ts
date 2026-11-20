import { describe, expect, it } from 'vitest';
import { cleanAndRankImages, isLowPriorityImageUrl, isRejectedImageUrl } from './imageFilter.js';

describe('imageFilter', () => {
  it('rejects observed logos, placeholders, defaults, crests, and share images', () => {
    const badUrls = [
      'https://familyhubsnetwork.com/wp-content/uploads/2023/11/Barking-Dagenham-FH-logo-3-pdf.jpg',
      'https://venkey.co.uk/assets/img/placeholder-large.png',
      'https://d1plawd8huk6hh.cloudfront.net/assets/default400.png',
      'https://eu-assets.simpleview-europe.com/windsor2017/imageresizer/?image=/images/lazyloadplaceholder.jpg&action=HighlightsScroll&allowdefault=1',
      'https://www.flyingfantastic.co.uk/images/logo1.png?a=b',
      'https://www.flyingfantastic.co.uk/images/share.png',
      'https://www.isleworthians.co.uk/wp-content/uploads/2019/11/logo2.png',
      'https://www.isleworthians.co.uk/wp-content/uploads/2019/11/crest.png',
    ];

    for (const url of badUrls) {
      expect(isRejectedImageUrl(url), `expected reject for ${url}`).toBe(true);
    }
  });

  it('keeps real venue photo URLs and does not reject banners outright', () => {
    const validUrls = [
      'https://librarytechnology.org/photos-libraries/26501.jpg',
      'https://daytona.co.uk/wp-content/uploads/Circuit-Image-3-scaled.jpg',
      'https://images.prismic.io/teamsport/988cc306-c965-436d-8d02-7c7e28c9f502_Mitcham.png',
      'https://daytona.co.uk/wp-content/uploads/Championships-banner.jpg',
      'https://images.prismic.io/teamsport/Zov4xR5LeNNTw6Bs_UK-Banner-Header-Blue-Electric.png?auto=format%2Ccompress&rect=624%2C0%2C800%2C488&w=800&h=488',
    ];

    for (const url of validUrls) {
      expect(isRejectedImageUrl(url), `expected valid for ${url}`).toBe(false);
    }
  });

  it('demotes banner and header URLs behind clean photos while keeping sole banners', () => {
    const daytonaBanner = 'https://daytona.co.uk/wp-content/uploads/Championships-banner.jpg';
    const daytonaPhoto = 'https://daytona.co.uk/wp-content/uploads/Circuit-Image-3-scaled.jpg';
    const teamsportHeader =
      'https://images.prismic.io/teamsport/Zov4xR5LeNNTw6Bs_UK-Banner-Header-Blue-Electric.png?auto=format%2Ccompress&rect=624%2C0%2C800%2C488&w=800&h=488';
    const teamsportPhoto = 'https://images.prismic.io/teamsport/988cc306-c965-436d-8d02-7c7e28c9f502_Mitcham.png';
    const badLogo = 'https://www.flyingfantastic.co.uk/images/logo1.png?a=b';

    expect(isLowPriorityImageUrl(daytonaBanner)).toBe(true);
    expect(isLowPriorityImageUrl(teamsportHeader)).toBe(true);
    expect(isLowPriorityImageUrl(daytonaPhoto)).toBe(false);

    expect(
      cleanAndRankImages([daytonaBanner, teamsportHeader, badLogo, daytonaPhoto, teamsportPhoto, daytonaPhoto]),
    ).toEqual([daytonaPhoto, teamsportPhoto, daytonaBanner, teamsportHeader]);

    expect(cleanAndRankImages([daytonaBanner])).toEqual([daytonaBanner]);
  });
});
