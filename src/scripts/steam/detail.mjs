import got from 'got';
import apps from '../../../apps';
import db from '../../db'
import gameSchema from '../../models/game'
import platformSchema from '../../models/platform'
import saleSchema from '../../models/sale'
import steamSchema from '../../models/steam'

(async () => {
  // Get connections for databases
  const serviceDB = await db.getConnection('scanGamesDB');
  const crawlerDB = await db.getConnection('crawlerDB');
  
  // Create model instances
  const Platform = serviceDB.model('platforms', platformSchema);
  const Game = serviceDB.model('games', gameSchema);
  const Sale = serviceDB.model('sales', saleSchema);
  const Steam = crawlerDB.model('steams', steamSchema);

  let steamDoc = await Platform.findOne({name: 'steam'})

  // Make crawling targts
  let crawled = await Steam.find({})
    .select({'appid': 1, '_id': 0});
  crawled = crawled.map(document => document.appid);
  const filteredApps = apps.filter(app => !crawled.includes(app.appid.toString()));

  const baseUrl = 'https://store.steampowered.com/api/appdetails?appids='
  const requestPromise = filteredApps.map(async (app, idx) => {
    if (idx > 1) return;
    if (await Steam.exists({appid: app.appid})) return;
    return got(baseUrl + app.appid).json();
  });
  const responses = await Promise.all(requestPromise);
  const createPromise = responses.map(async (res) => {
    if (!res) return;
    const appid = Object.keys(res)[0];
    const data = res[appid].data;
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
      platforms: [steamDoc],
      description: data.short_description,
      genres: data.genres.map(genre => genre.description)
    })

    const saleDoc = await Sale.create({
      platform: steamDoc,
      game: gameDoc,
      gameUuid: appid,
      price: 0,
    });

    gameDoc.sales.push(saleDoc)
    return await gameDoc.save()
  })

  const creates = await Promise.all(createPromise);
  // TODO: Handle post processing for the end of crawling
  serviceDB.close();
  crawlerDB.close();
})();
