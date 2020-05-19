import got from 'got';
import apps from '../../../apps.mjs';
import db from '../../db.mjs'
import gameSchema from '../../models/service/game.mjs'
import saleSchema from '../../models/service/sale.mjs'
import steamSchema from '../../models/crawler/steam.mjs'

(async () => {
  // Get connections for databases
  const serviceDB = await db.getConnection('scanGamesDB');
  const crawlerDB = await db.getConnection('crawlerDB');
  
  // Create model instances
  const Game = serviceDB.model('games', gameSchema);
  const Sale = serviceDB.model('sales', saleSchema);
  const Steam = crawlerDB.model('steams', steamSchema);

  // Make crawling targts
  let crawled = await Steam.find({})
    .select({'appid': 1, '_id': 0});
  crawled = crawled.map(document => document.appid);
  const filteredApps = apps.filter(app => !crawled.includes(app.appid.toString()));

  const baseUrl = 'https://store.steampowered.com/api/appdetails?cc=kr&l=kr&appids=';
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const requestPromise = filteredApps.map(async (app, idx) => {
    if (await Steam.exists({appid: app.appid})) return;

    // Request app detail
    await delay(1000 * idx); // Set Delay to avoid 429
    const res = await got(baseUrl + app.appid).json();
    if (!res) return;

    const appid = Object.keys(res)[0];
    const data = res[appid].data;
    if (res[appid].success == false) {
      return await Steam.create({
        appid: appid,
        success: res[appid].success
      });
    }
    // Create crawling log
    // TODO: Add more fields to track history
    await Steam.create({
      appid: appid,
      type: data.type,
      success: res[appid].success
    });
    if (!data.type == 'game') return;
    // Create only game except other types such as sound track, demo, and so on.
    // TODO: Implement DLC crawling
    const gameDoc = await Game.create({
      name: data.name,
      publisher: data.publishers[0],
      thumbUrl: data.header_image,
      coverUrl: data.screenshots[0].path_pull,
      sales: [],
      description: data.short_description,
      genres: data.genres.map(genre => genre.description)
    });

    const saleDoc = await Sale.create({
      platform: 'steam',
      game: gameDoc,
      gameUuid: appid,
      price: 0,
    });

    gameDoc.sales.push(saleDoc);
    return await gameDoc.save()
  });
  const creates = await Promise.all(requestPromise);

  // TODO: Handle post processing for the end of crawling
  serviceDB.close();
  crawlerDB.close();
})();
