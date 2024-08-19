import { points, buildings, game, getPlayerArray } from '../index.js';
import broadcast, { broadcastPoints, broadcastPlayers, log } from './broadcast.js';
import { addPlayer } from './server.js';
import { Tile } from './geometry.js';
import { shuffle, generateMap, stringifyResources } from './utils.js';
import { WebSocketServer } from 'ws';
import { Trade } from './trading.js';

const wss = new WebSocketServer({ port: 8080 });

export default function start() {
    game.map = generateMap();

    let roll = 0;

    let robber = [];
    for (let i = 0; i < game.map.terrainMap.length; i++) {
        for (let j = 0; j < game.map.terrainMap[i].length; j++) {
            if (game.map.terrainMap[i][j] === "Desert") {
                robber = [i, j];
                break;
            }
        }
    }
    let robberMoved = false;

    let knight = false;
    let largestArmyMin = 3;

    let developmentDistr = {
        knight: 14,
        monopoly: 2,
        yearOfPlenty: 2,
        roadBuilding: 2,
        victoryPoint: 5
    };
    game.developments = shuffle(Object.keys(developmentDistr).map(development => Array(developmentDistr[development]).fill(development)).flat());

    for (let i = Math.ceil(game.map.terrainMap.length / 2) - 1; i >= 0; i--) {
        let temp = [];
        for (let j = 0; j < game.map.terrainMap[i].length * 2 + 1; j++) {
            temp.push(NaN);
        }
        points.settlementVertices.unshift(Array.from(temp));
        points.settlementVertices.push(Array.from(temp));
        points.cityVertices.unshift(Array.from(temp));
        points.cityVertices.push(Array.from(temp));
        buildings.settlements.unshift(Array.from(temp));
        buildings.settlements.push(Array.from(temp));
        buildings.cities.unshift(Array.from(temp));
        buildings.cities.push(Array.from(temp));
    }

    for (let i = Math.ceil(game.map.terrainMap.length / 2) - 1; i >= 0; i--) {
        let temp1 = [];
        let temp2 = [];
        for (let j = 0; j < game.map.terrainMap[i].length * 2; j++) {
            if (j < game.map.terrainMap[i].length + 1) {
                temp1.push(NaN);
            }
            temp2.push(NaN);
        }
        points.roadEdges.push(Array.from(temp1));
        buildings.roads.push(Array.from(temp1));
        if (i != Math.ceil(game.map.terrainMap.length / 2) - 1) {
            points.roadEdges.unshift(Array.from(temp1));
            buildings.roads.unshift(Array.from(temp1));
        }
        points.roadEdges.push(Array.from(temp2));
        points.roadEdges.unshift(Array.from(temp2));
        buildings.roads.push(Array.from(temp2));
        buildings.roads.unshift(Array.from(temp2));
    }

    wss.on('connection', (ws) => {
        console.log('connected');

        ws.on('message', (message) => {
            console.log(`${message}`);

            const args = String(message).split(' ');

            var player = game.round === 1 ? Array.from(game.players)[game.players.size - 1 - (game.turn % game.players.size)] : Array.from(game.players)[game.turn % game.players.size];

            if (args[0] === 'add') {
                addPlayer(args[1], ws);
            }
            else if (args[0] === 'ready') {
                game.ready.add(ws);
                if (game.ready.size === game.players.size) {
                    broadcast('start game')
                    Array.from(game.clients)[0].send('start turn');
                    broadcast('turn ' + game.turn);
                }
            }
            else if (args[0] === 'unready') {
                game.ready.delete(ws);
            }
            else if (args[0] === 'trade') {
                if (args[1] === 'domestic') {
                    let you = Array.from(game.players).find(player => player.name === args[2]);
                    Trade.offerDomestic(you, JSON.parse(args[3]), JSON.parse(args[4]), JSON.parse(args[5]), args[6]);
                }
                else if (args[1] === 'maritime') {
                    Trade.maritime(player, JSON.parse(args[2]), JSON.parse(args[3]));
                }
                else if (args[1] === 'accept') {
                    let you = Array.from(game.players).find(player => player.name === args[2]);
                    let them = Array.from(game.players).find(player => player.name === args[4]);
                    Trade.acceptDomestic(you, JSON.parse(args[3]), them, JSON.parse(args[5]), args[6]);
                }
                broadcastPlayers();
            }
            else if (args[0] === 'develop') {
                player.develop();
                broadcastPlayers();
            }
            else if (args[0] === 'progress') {
                if (args[1] === 'monopoly') {
                    // check if player has monopoly card
                    if (player.developments["monopoly"] === 0) {
                        ws.send('error No monopoly cards left');
                        return;
                    }
                    log(player.name + ' used monopoly for ' + args[2]);
                    for (let i = 0; i < getPlayerArray().length; i++) {
                        if (i === game.turn % getPlayerArray().length) {
                            continue;
                        }
                        player.resources[args[2]] += getPlayerArray()[i].resources[args[2]];
                        getPlayerArray()[i].resources[args[2]] = 0;
                    }
                }
                else if (args[1] === 'yearOfPlenty') {
                    // check if player has year of plenty card
                    if (player.developments["yearOfPlenty"] === 0) {
                        ws.send('error No year of plenty cards left');
                        return;
                    }
                    // check if player took 2 resources
                    let totalResources = Object.values(JSON.parse(args[2])).reduce((a, b) => a + b, 0);
                    if (totalResources != 2) {
                        ws.send('error Must take 2 resources');
                        return;
                    }
                    log(player.name + ' used year of plenty for ' + stringifyResources(JSON.parse(args[2])));
                    let resources = JSON.parse(args[2]);
                    for (let resource of Object.keys(resources)) {
                        player.resources[resource] += resources[resource];
                    }
                }
                else if (args[1] === 'roadBuilding') {
                    // check if player has road building card
                    if (player.developments["roadBuilding"] === 0) {
                        ws.send('error No road building cards left');
                        return;
                    }

                    player.roadBuilding = true;
                    log(player.name + ' used road building');
                }
                player.developments[args[1]]--;
                broadcastPlayers();
            }
            else if (args[0] === 'knight' || args[0] === 'rob') {
                if (args.length === 1) {
                    if (args[0] === 'knight') {
                        // check if player has knight card
                        if (player.developments["knight"] === 0) {
                            ws.send('error No knight cards left');
                            return;
                        }

                        log(player.name + ` used a knight`);
                        knight = true;
                        player.developments["knight"]--;
                        player.army++;
                        if (player.army >= largestArmyMin) {
                            largestArmyMin = player.army + 1;
                            for (let i = 0; i < game.players.size; i++) {
                                if (getPlayerArray()[i].specials["largestArmy"]) {
                                    getPlayerArray()[i].specials["largestArmy"] = false;
                                    getPlayerArray()[i].points -= 2;
                                }
                            }
                            player.specials["largestArmy"] = true;
                            player.points += 2;
                        }
                    }
                }
                else {
                    let victim = Array.from(game.players).find(player => player.name === args[1]);
                    const randomResource = victim.randomResource();
                    victim.resources[randomResource]--;
                    player.resources[randomResource]++;
                }
                broadcastPlayers();
            }
            else if (args[0] === 'build') { // e.g., build settlement 0 0 red
                if (args[1] === 'settlement') {
                    player.buildSettlement(parseInt(args[2]), parseInt(args[3]));
                }
                else if (args[1] === 'city') {
                    player.buildCity(parseInt(args[2]), parseInt(args[3]));
                }
                else if (args[1] === 'road') {
                    player.buildRoad(parseInt(args[2]), parseInt(args[3]));
                }

                broadcastPoints();
                broadcastPlayers();
            }
            else if (args[0] === 'get') {
                if (args[1] === 'map') {
                    ws.send('map ' + JSON.stringify(game.map));
                }
                else if (args[1] === 'points') {
                    broadcastPoints();
                }
                else if (args[1] === 'robber') {
                    ws.send(`robber ${robber[0]} ${robber[1]}`);
                }
            }
            else if (args[0] === 'robber') {
                if ((roll === 7 && !robberMoved) || knight) {
                    robber = [parseInt(args[1]), parseInt(args[2])];

                    knight = false;
                    let adjacentPlayers = [];

                    const vertices = Tile.adjacentVertices(robber[0], robber[1]);
                    for (let i = 0; i < vertices.length; i++) {
                        if (!isNaN(buildings.settlements[vertices[i][0]][vertices[i][1]]) && buildings.settlements[vertices[i][0]][vertices[i][1]] != game.turn % game.players.size) {
                            adjacentPlayers.push(getPlayerArray()[buildings.settlements[vertices[i][0]][vertices[i][1]]].name);
                        }
                        else if (!isNaN(buildings.cities[vertices[i][0]][vertices[i][1]]) && buildings.cities[vertices[i][0]][vertices[i][1]] != game.turn % game.players.size) {
                            adjacentPlayers.push(getPlayerArray()[buildings.cities[vertices[i][0]][vertices[i][1]]].name);
                        }
                    }

                    // remove duplicates
                    adjacentPlayers = Array.from(new Set(adjacentPlayers));

                    ws.send(`rob ${JSON.stringify(adjacentPlayers)}`);
                    broadcast(String(message));
                    robberMoved = true;
                }
            }
            else if (args[0] === 'chat') {
                // check if message is empty
                if (args.slice(2).join(' ') === '') return;
                // check if player exists
                if (getPlayerArray().find(player => player.name === args[1]) === undefined) return;

                broadcast(String(message));
            }

            else if (args[0] === 'end' && args[1] === 'turn') {
                if (game.turn < game.players.size * 2 - 1) { // can't use round because it is incremented after this
                    if (player.buildings["settlements"] > 4 - game.round) {
                        ws.send(`error You must build a settlement and a road during round ${["one", "two"][game.round]}`);
                    }
                    else if (player.buildings["roads"] > 14 - game.round) {
                        ws.send(`error You must build a road during round ${["one", "two"][game.round]}`);
                    }
                    else {
                        log(player.name + ' ended their turn');
                        game.turn++;
                        game.round = Math.floor(game.turn / game.players.size);
                    }

                    Array.from(game.clients)[game.round === 1 ? game.players.size - 1 - (game.turn % game.players.size) : game.turn % game.players.size].send('start turn');
                    broadcast('turn ' + game.turn)
                }
                else {
                    log(player.name + ' ended their turn');
                    game.turn++;
                    game.round = Math.floor(game.turn / game.players.size);
                    robberMoved = false;
                    // roll dice
                    Array.from(game.clients)[game.turn % game.players.size].send('start turn');
                    broadcast('turn ' + game.turn);
                    roll = Math.floor(Math.random() * 6 + 1) + Math.floor(Math.random() * 6 + 1);
                    broadcast('roll ' + roll);

                    for (let i = 0; i < game.map.terrainMap.length; i++) {
                        for (let j = 0; j < game.map.terrainMap[i].length; j++) {
                            if (game.map.numberMap[i][j] === roll && (i != robber[0] || j != robber[1])) {
                                const vertices = Tile.adjacentVertices(i, j);
                                for (let k = 0; k < vertices.length; k++) {
                                    const settlement = buildings.settlements[vertices[k][0]][vertices[k][1]];
                                    const city = buildings.cities[vertices[k][0]][vertices[k][1]];
                                    if (!isNaN(settlement)) {
                                        const player = getPlayerArray()[settlement];
                                        player.resources[game.terrainToResource[game.map.terrainMap[i][j]]] += 1;
                                    }
                                    if (!isNaN(city)) {
                                        const player = getPlayerArray()[city];
                                        player.resources[game.terrainToResource[game.map.terrainMap[i][j]]] += 2;
                                    }
                                }
                            }
                        }
                    }

                    broadcastPlayers();
                    broadcastPoints();
                }
            }
        });

        ws.on('close', () => {
            console.log('disconnected');
            for (let i = 0; i < game.players.size; i++) {
                if (Array.from(game.clients)[i] === ws) {
                    game.players.delete(Array.from(game.players)[i]);
                    game.clients.delete(ws);
                }
            }
            broadcastPlayers();
        });
    });
}