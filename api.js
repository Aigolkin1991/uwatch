const redis = require("redis");
const client = redis.createClient();
const { sendJSONPost } = require('./helper');
const {
    graphql: {
        http: {
            host,
            path,
            port
        }, 
        query
    }
} = require('./config');

const _getStarted = () => {
    return {
        text: 'Will return list of 5 closest matches',
        inline_keyboard: [
            [{ text: 'Get matches', callback_data: '/getMatchList' }],
        ]
    };
}

const _getMatchData = () => {
    return sendJSONPost(query, host, path, port).then((response) => {
        const res = [];
        let matchData = response && response.data && 
            response.data.project && 
            response.data.project.matches && 
            response.data.project.matches.items || [];        
        matchData.sort((a, b) => {
            return new Date(a.startedAt).getTime() > new Date(b.startedAt).getTime() ? 1 : -1
        });
        matchData = matchData.slice(0,5)
        for (let item of matchData) {
            client.set(`tour_${item.id}`, item.tournamentName);
            res.push({
                text: `[${item.event.game}] ${item.tournamentName}\n${item.opponent.name} - ${item.player.name}\n${item.status === 'live' ? 'Live' : `Will be held on ${item.startedAt.replace('T', ' ').split('.')[0]}`}`,
                inline_keyboard: [
                    [{text: `Vote for: ${item.opponent.name}`, callback_data: `/votePlayer!!${item.id}@@${item.opponent.name}`}],
                    [{text: `Vote for: ${item.player.name}`, callback_data: `/votePlayer!!${item.id}@@${item.player.name}`}],
                    [{text: `Show vote results`, callback_data: `/getVoteResult!!${item.id}`}]
                ]
            })
        }
        return res;
    }).catch((err) => {
        console.error('Match data retrieve error', err);
        return {text: 'Internal error, try later'};
    });
}

const voteFor = (requestParams) => {
    const user = requestParams.userName;
    const [event,player] = requestParams.commandArg;
    const userVoteKey = `${event}_${user}`;

    return new Promise((resolve, reject) => {
        client.get(userVoteKey, (err, reply) => {
            if(!reply){
                client.setex(userVoteKey, 48 * 3600, '1', (err) => {
                    if (!err) {
                        client.hincrby(`stat_${event}`, player, 1, (err) => {
                            if (err) {
                                console.error('Redis hincrby error in voteFor()', err)
                                resolve({text: 'You can not vote at that time'})
                            } else {
                                resolve({text: `You succesfully voted for ${player}`})
                            }
                        });
                    } else {
                        console.error('Redis setex error in voteFor()', err);
                        resolve({text: 'You can not vote at that time'})
                    }
                });
            } else {
                resolve({text: 'You can not vote at that time'})
            }
        });
    })
};

const _printStat = (obj) => {
    const res = []
    for (let k in obj) {
        res.push(`${k} : ${obj[k]}`);
    }
    return res.join('\n');
}

const getVoteStat = (requestParams) => {
    const [ event ] = requestParams.commandArg

    const getNamePromise = new Promise((resolve, reject) => {
        client.get(`tour_${event}`, (err, reply) => {
            err || !reply ? reject('No info about event') : resolve(reply);
        });
    });
    const getStatPromise = new Promise((resolve, reject) => {
        client.hgetall(`stat_${event}`, (err, reply) => {
            err || !reply ? reject('No stat data') : resolve(reply);
        });
    });
    return Promise.all([getNamePromise, getStatPromise]).then((result) => {
        const [eventName, eventStat] = result
        return {text: `${eventName}\n${_printStat(eventStat)}`};
    }).catch((err) => {
        console.error("Get vote stat error", err);
        return {text: 'Internal error, try later'};
    })
};

const apiMethod = {
    '/getMatchList': {
        f: _getMatchData
    },
    '/votePlayer': {
        f: voteFor
    },
    '/getVoteResult': {
        f: getVoteStat
    },
    '/start': {
        f: _getStarted
    }
};

const respondToApiCall = (requestParams) => {
    const method = apiMethod[requestParams.command] && apiMethod[requestParams.command].f;
    if(method)
        return method(requestParams)
    else
        return null;
}

module.exports = {
    respondToApiCall
}