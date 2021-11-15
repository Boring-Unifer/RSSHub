import got from '~/utils/got.js';
import cheerio from 'cheerio';
import parser from '~/utils/rss-parser';

export default async (ctx) => {
    const feed = await parser.parseURL('http://www.zreading.cn/feed');

    const ProcessFeed = (data) => {
        const $ = cheerio.load(data);

        $('.grap script').remove();
        $('.grap .adsbygoogle').remove();

        // 提取内容
        return $('.grap').html();
    };

    const items = await Promise.all(
        feed.items.map(async (item) => {
            const cache = await ctx.cache.get(item.link);
            if (cache) {
                return JSON.parse(cache);
            }

            const response = await got({
                method: 'get',
                url: item.link,
            });

            const description = ProcessFeed(response.data);

            const single = {
                title: item.title,
                description,
                pubDate: item.pubDate,
                link: item.link,
                author: item.author,
            };
            ctx.cache.set(item.link, JSON.stringify(single));
            return single;
        })
    );

    ctx.state.data = {
        title: feed.title,
        link: feed.link,
        description: feed.description,
        item: items,
    };
};