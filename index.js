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
    map: null,
    developments: []
}

export const terrainToResource = {
    'Forest': 'lumber',
    'Hill': 'brick',
    'Mountain': 'ore',
    'Pasture': 'wool',
    'Field': 'grain'
}

export function getPlayerArray() {
    return Array.from(game.players);
}

export function getTurnPlayer() {
    return getPlayerArray()[game.turn % game.players.size];
}

start();