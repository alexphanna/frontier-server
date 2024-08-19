import { game, getTurnPlayer } from '../index.js';
import { log } from './broadcast.js';
import { stringifyResources, joinWithAnd } from './utils.js';
import broadcast from './broadcast.js';

export class Trade {
    static offerDomestic(you, yourResources, them, theirResources, id) {
        if (!isTradeLegal(you, yourResources, theirResources)) {
            return;
        }

        if (you.name !== getTurnPlayer().name) {
            for (let i = 0; i < game.players.size; i++) {
                them.client.send(`trade domestic ${you.name} ${JSON.stringify(yourResources)} ${them.name} ${JSON.stringify(theirResources)} ${id}`);
            }
            you.client.send('notification Trade offer sent to ' + them.name);
            log(you.name + ' offered ' + stringifyTrade(yourResources, theirResources) + ' to ' + them.name);
        }
        else {
            let players = them;
            for (let i = 0; i < game.players.size; i++) {
                if (Array.from(game.players)[i].name === you.name) {
                    continue;
                }
                if (!players.includes(Array.from(game.players)[i].name)) {
                    continue;
                }

                Array.from(game.clients)[i].send(`trade domestic ${you.name} ${JSON.stringify(yourResources)} ${JSON.stringify(them)} ${JSON.stringify(theirResources)} ${id}`);
            }
            if (players.length === game.players.size - 1) {
                you.client.send('notification Trade offer sent to everyone');
                log(you.name + ' offered ' + stringifyTrade(you, them) + ' to everyone');
            }
            else {
                you.cient.send('notification Trade offer sent to ' + joinWithAnd(players));
                log(you.name + ' offered ' + stringifyTrade(you, them) + ' to ' + joinWithAnd(players));
            }
        }
    }
    static acceptDomestic(you, yourResources, them, theirResources, id) {
        you.subtractResources(yourResources);
        you.addResources(theirResources);
        them.subtractResources(theirResources);
        them.addResources(yourResources);
        log(you.name + ' and ' + them.name + ' traded ' + stringifyTrade(yourResources, theirResources));
        broadcast(`trade unoffer ${id}`)
    }
    static maritime(you, yourResources, theirResources) {
        if (!isTradeLegal(you, yourResources, theirResources)) {
            return;
        }

        for (let i = 2; i <= 4; i++) {
            if (i == 2) {
                let hasHarbors = true;
                for (let key of Object.keys(yourResources)) {
                    if (!you.harbors.includes(key)) {
                        hasHarbors = false;
                    }
                }
                if (!hasHarbors) {
                    continue;
                }
            }
            else if (i == 3 && !you.harbors.includes("generic")) {
                continue;
            }
            if (isRatio(yourResources, theirResources, i)) {
                log(you.name + ' maritime traded ' + stringifyTrade(yourResources, theirResources));
                you.subtractResources(yourResources);
                you.addResources(theirResources);
                return;
            }
        }

        you.client.send('error Invalid maritime trade');
    }
}

function isTradeLegal(you, yourResources, theirResources) {
    // check if it is past the initial phase
    // if (round < 2) return false; UNCOMMENT LATER

    // check if player has resources
    if (!you.hasResources(yourResources)) {
        you.client.send('error Insufficient resources');
        return false;
    }

    if (Object.keys(yourResources).length === 0 || Object.keys(theirResources).length === 0) {
        you.client.send('error You must include at least one resource on each side of the trade', true);
        return false;
    }

    let equal = false;
    for (let key of Object.keys(yourResources)) {
        if (key in theirResources) {
            equal = true;
        }
    }
    if (equal) {
        you.client.send('error You may not trade like resources (e.g., 2 brick → 1 brick)', true);
        return false;
    }

    return true;
}

function stringifyTrade(you, them) {
    let string = stringifyResources(you) + ' → ' + stringifyResources(them);
    return string;
}

/**
 * Checks if the ratio between two sides of a trade is valid.
 * @param {Object} you - The first side of the trade.
 * @param {Object} them - The second side of the trade.
 * @param {number} antecedent - The antecedent value used for the ratio calculation.
 * @returns {boolean} - Returns true if the ratio is valid, false otherwise.
 */
function isRatio(you, them, antecedent) {
    let youTotal = Object.values(you).reduce((a, b) => a + b, 0);
    let themTotal = Object.values(them).reduce((a, b) => a + b, 0);

    if (themTotal * antecedent !== youTotal) return false;
    for (let key of Object.keys(you)) {
        if (you[key] % antecedent !== 0) {
            return false;
        }
    }
    return true;
}