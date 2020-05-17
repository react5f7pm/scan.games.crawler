import got from 'got';
import apps from '../../../apps.mjs';
import db from '../../db.mjs'
import gameSchema from '../../models/service/game.mjs'
import saleSchema from '../../models/service/sale.mjs'
import playstationSchema from '../../models/crawler/playstation.mjs'

(async () => {
  // Get connections for databases
  const serviceDB = await db.getConnection('scanGamesDB');
  const crawlerDB = await db.getConnection('crawlerDB');
  
  // Create model instances
  const Game = serviceDB.model('games', gameSchema);
  const Sale = serviceDB.model('sales', saleSchema);
  const PlayStation = crawlerDB.model('playstations', playstationSchema);

  // Make crawling targts
  // let crawled = await Steam.find({})
  //   .select({'appid': 1, '_id': 0});
  // crawled = crawled.map(document => document.appid);
  // const filteredApps = apps.filter(app => !crawled.includes(app.appid.toString()));

  const baseUrl = 'https://store.playstation.com/valkyrie-api/ko/KR/999/container/STORE-MSF86012-GAMESALL?'
  console.log(baseUrl)
  const itemPerPage = 50
  const requestParams = {
    game_content_type: 'games',
    size: itemPerPage.toString(),
    bucket: 'games',
    game_demo: 'false'
  }
  const requestParamString = Object
    .entries(requestParams)
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  const requestUrl = baseUrl + requestParamString + '&start=0'

  const requestSize = await got(requestUrl).json()
  const totalSize = requestSize.data.attributes['total-results']
  const totalPage = (totalSize / itemPerPage).toFixed() + 1

  const requestPromise = Array.from({length: totalPage}).map((_, index) => {
    return got(baseUrl + requestParamString + '&start=' + (itemPerPage * index).toString()).json()
  })
  const responses = await Promise.all(requestPromise);

  const createPromise = responses.map(async (res) => {
    if (!res) return;
    res.included.map((item, index) => {
      if (index % 2 === 0) {
        // Meta data
        console.log(item.attributes.price)
      } else {
        // Game info
        console.log(item.attributes.name)
      }
    })
  })

  // const creates = await Promise.all(createPromise);
  // TODO: Handle post processing for the end of crawling
  serviceDB.close();
  crawlerDB.close();
})();
