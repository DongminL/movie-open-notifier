import { buildCgvWebUrl } from './cgv-link-generator';

describe('buildCgvWebUrl', () => {
  it('builds a CGV booking deep link with the encoded query params', () => {
    const url = buildCgvWebUrl({
      siteNo: '0013',
      siteNm: '용산아이파크몰',
      scnYmd: '20260825',
    });

    expect(url).toBe(
      'https://cgv.co.kr/met/webAppUsgGoid?r=%2Fcnm%2FmovieBook%2Fcinema%3FsiteNo%3D0013%26siteNm%3D%25EC%259A%25A9%25EC%2582%25B0%25EC%2595%2584%25EC%259D%25B4%25ED%258C%258C%25ED%2581%25AC%25EB%25AA%25B0%26scnYmd%3D20260825',
    );
  });
});
