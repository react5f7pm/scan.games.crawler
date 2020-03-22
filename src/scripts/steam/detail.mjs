import got from 'got';
import apps from '../../../apps';
import db from '../../db'
import gameSchema from '../../models/game'
import steamSchema from '../../models/steam'

(async () => {
    // Get connections for databases
    const serviceDB = await db.getConnection('scanGamesDB');
    const crawlerDB = await db.getConnection('crawlerDB');
    
    // Create model instances
    const Game = serviceDB.model('games', gameSchema);
    const Steam = crawlerDB.model('steams', steamSchema);

    // Make crawling targts
    let crawled = await Steam.find({})
        .select({'appid': 1, '_id': 0})
    crawled = crawled.map(document => document.appid);
    const filteredApps = apps.filter(app => !crawled.includes(app.appid.toString()))

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
        })
        if (!data.type == 'game') return;
        // Create only game except other types such as sound track, demo, and so on.
        // TODO: Implement DLC crawling
        return await Game.create({
            name: data.name,
            publisher: data.publishers[0],
            thumbUrl: data.header_image,
            coverUrl: data.screenshots[0].path_pull,
            description: data.short_description,
            genres: data.genres.map(genre => genre.description)
        })
    })

    const creates = await Promise.all(createPromise);
    // TODO: Handle post processing for the end of crawling
    serviceDB.close();
    crawlerDB.close();
})();
