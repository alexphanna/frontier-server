import { game, getPlayerArray } from '../index.js';
import { PublicPlayer } from './player.js';
import { filterSettlements, filterCities, filterRoads } from './filter.js';

export default function broadcast(message) {
    for (let client of game.clients) {
        client.send(message);
    }
}

export function broadcastPoints() {
    for (let i = 0; i < game.players.size; i++) {
        Array.from(game.clients)[i].send('vertices settlement ' + JSON.stringify(filterSettlements(i)));
        Array.from(game.clients)[i].send('vertices city ' + JSON.stringify(filterCities(i)));
        Array.from(game.clients)[i].send('edges ' + JSON.stringify(filterRoads(i)));
    }
}

export function broadcastPlayers() {
    for (let i = 0; i < game.players.size; i++) {
        const newPlayers = [];
        for (let j = 0; j < getPlayerArray().length; j++) {
            if (j === i) {
                newPlayers.push(getPlayerArray()[j]);
            }
            else {
                newPlayers.push(new PublicPlayer(getPlayerArray()[j]));
            }
        }
        Array.from(game.clients)[i].send('players ' + JSON.stringify(newPlayers));
    }
}

/**
 * Logs a message and broadcasts it to all clients.
 * @param {string} message - The message to be logged.
 */
export function log(message) {
    broadcast(`log ${message}`);
}