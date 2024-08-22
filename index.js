import start from './modules/start.js';
import { shuffle } from './modules/utils.js';

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

const colors = shuffle(["#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF", "#FF8000", "#FFFFFF"]);

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
    developments: [],
    colors: Array.from(colors),
    availableColors: Array.from(colors)
}

export const mapLengths = [3, 4, 5, 4, 3];

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