import got from 'got';
import cheerio from 'cheerio'
import apps from '../../../apps';
import db from '../../db'
import gameSchema from '../../models/game'
import platformSchema from '../../models/platform'
import saleSchema from '../../models/sale'
import steamSchema from '../../models/steam'

(async () => {
  // Get connections for databases
  // const serviceDB = await db.getConnection('scanGamesDB');
  // const crawlerDB = await db.getConnection('crawlerDB');

  // // Create model instances
  // const Platform = serviceDB.model('platforms', platformSchema);
  // const Game = serviceDB.model('games', gameSchema);
  // const Sale = serviceDB.model('sales', saleSchema);
  // const Steam = crawlerDB.model('steams', steamSchema);

  // let steamDoc = await Platform.findOne({name: 'steam'});
  const baseUrl = 'https://store.steampowered.com/search/results/?query'
  let queries = {
    start: 0,
    count: 50,
    specials: 1,
    sort_by: '_ASC',
    // filter: 'topsellers',
    infinite: 1,
    snr: '1_7_7_2300_7',
  }
  const response = await got(
    baseUrl + Object.keys(queries).map(key => `&${key}=${queries[key]}`).join('')
  ).json()
  const totalCount = response['total_count']
  const $ = cheerio.load(response['results_html'])
  const appids = $('.search_result_row').map((idx, elem) => {
    if (idx > 1) return;
    return $(elem).data('ds-appid');
  }).get();
  const priceids = $('.search_price_discount_combined').map((idx, elem) => {
    if (idx > 1) return;
    return $(elem).data('price-final');
  }).get();
  console.log(appids, priceids);
})();