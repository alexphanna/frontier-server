import start from './modules/start.js';

export const points = {
    settlementVertices: [],
    cityVertices: [],
    roadEdges: []
}

export const buildings = {
    settlements: [],
    cities: [],
    roads: []
}

export const game = {
    players: new Set(),
    clients: new Set(),
    ready: new Set(),
    turn: 0,
    round: 0,
    longestRoad: {
        length: 0,
        player: null
    },
    map: null
}

export function getPlayerArray() {
    return Array.from(game.players);
}

start();