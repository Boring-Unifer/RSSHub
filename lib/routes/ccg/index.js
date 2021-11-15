import got from '~/utils/got.js';
import cheerio from 'cheerio';

export default async (ctx) => {
    const {
        category = 'news'
    } = ctx.params;

    const rootUrl = 'http://www.ccg.org.cn';
    const currentUrl = `${rootUrl}/${category}`;
    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = cheerio.load(response.data);

    const list = $('.huodong-list li a')
        .slice(0, 10)
        .map((_, item) => {
            item = $(item);
            return {
                link: item.attr('href'),
                title: item.find('h5').text(),
                pubDate: new Date(item.find('span').text().replace(/年|月/g, '-').replace(/日/, '')).toUTCString(),
            };
        })
        .get();

    const items = await Promise.all(
        list.map((item) =>
            ctx.cache.tryGet(item.link, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });
                const content = cheerio.load(detailResponse.data);

                item.description = content('.pinpai-page').html();

                return item;
            })
        )
    );

    ctx.state.data = {
        title: `${$('title').text()} - 全球化智库`,
        link: currentUrl,
        item: items,
    };
};