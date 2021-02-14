module.exports = {
    graphql: {
        http: {
            host: 'uwatch.live',
            path: '/graphql',
            port: 443
        },
        query: `{
            "operationName": "getMatchesList",
            "variables": {
                "id": "1"
            },
            "query": "query getMatchesList($id: ID!, $status: MatchStatus, $game: String, $paging: PagingInput) {project(id: $id, isPublic: true) { matches(status: $status, game: $game, paging: $paging) {items {id startedAt tournamentName event{game} opponent {name} player {name}status}}}}"
        }`
    },
    telegram: {
        token: ''
    }
}