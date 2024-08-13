import { points, buildings, game, getPlayerArray } from '../index.js';
import broadcast, { broadcastPoints, broadcastPlayers, log } from './broadcast.js';
import { Vertex, Edge, Tile } from './geometry.js';
import Player from './player.js';
import longestRoad from './longest-road.js';
import { shuffle, generateMap, stringifyResources, stringifyTrade, joinWithAnd } from './utils.js';
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

export default function start() {
    let colors = shuffle(["red", "orange", "yellow", "lime", "blue", "magenta"]);
    let map = generateMap();

    let robber = [];
    for (let i = 0; i < map.terrainMap.length; i++) {
        for (let j = 0; j < map.terrainMap[i].length; j++) {
            if (map.terrainMap[i][j] === "Desert") {
                robber = [i, j];
                break;
            }
        }
    }

    let roadBuilding = false;
    let roadsBuilt = 0;
    let knight = false;
    let largestArmyMin = 3;

    let developmentDistr = {
        knight: 14,
        monopoly: 2,
        yearOfPlenty: 2,
        roadBuilding: 2,
        victoryPoint: 5
    };
    let developments = shuffle(Object.keys(developmentDistr).map(development => Array(developmentDistr[development]).fill(development)).flat());
    
    for (let i = Math.ceil(map.terrainMap.length / 2) - 1; i >= 0; i--) {
        let temp = [];
        for (let j = 0; j < map.terrainMap[i].length * 2 + 1; j++) {
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

    for (let i = Math.ceil(map.terrainMap.length / 2) - 1; i >= 0; i--) {
        let temp1 = [];
        let temp2 = [];
        for (let j = 0; j < map.terrainMap[i].length * 2; j++) {
            if (j < map.terrainMap[i].length + 1) {
                temp1.push(NaN);
            }
            temp2.push(NaN);
        }
        points.roadEdges.push(Array.from(temp1));
        buildings.roads.push(Array.from(temp1));
        if (i != Math.ceil(map.terrainMap.length / 2) - 1) {
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

            const terrainToResource = {
                'Forest': 'lumber',
                'Hill': 'brick',
                'Mountain': 'ore',
                'Pasture': 'wool',
                'Field': 'grain'
            }

            var player = game.round === 1 ? Array.from(game.players)[game.players.size - 1 - (game.turn % game.players.size)] : Array.from(game.players)[game.turn % game.players.size];

            if (args[0] === 'add') {
                ws.send('color ' + colors[game.players.size]);
                game.players.add(new Player(args[1], colors[game.players.size]));
                game.clients.add(ws);
                ws.send('map ' + JSON.stringify(map));
                broadcastPlayers();
                broadcastPoints();
            }
            else if (args[0] === 'ready') {
                game.ready.add(ws);
                if (game.ready.size === game.players.size) {
                    broadcast('start game')
                    Array.from(game.clients)[0].send('start turn');
                }
            }
            else if (args[0] === 'unready') {
                game.ready.delete(ws);
            }
            else if (args[0] === 'trade') {
                function isTradeLegal(you, them) {
                    // check if it is past the initial phase
                    // if (round < 2) return false; UNCOMMENT LATER

                    // check if player has resources
                    if (!player.hasResources(you)) {
                        ws.send('error Insufficient resources');
                        return false;
                    }

                    if (Object.keys(you).length === 0 || Object.keys(them).length === 0) {
                        ws.send('error You must include at least one resource on each side of the trade', true);
                        return false;
                    }

                    let equal = false;
                    for (let key of Object.keys(you)) {
                        if (key in them) {
                            equal = true;
                        }
                    }
                    if (equal) {
                        ws.send('error You may not trade like resources (e.g., 2 brick → 1 brick)', true);
                        return false;
                    }

                    return true;
                }

                if (args[1] === 'domestic') {
                    const you = JSON.parse(args[3]);
                    const them = JSON.parse(args[5]);

                    if (!isTradeLegal(you, them)) {
                        return;
                    }

                    if (player.name !== args[2]) {
                        for (let i = 0; i < game.players.size; i++) {
                            if (Array.from(game.players)[i].name === player.name) {
                                Array.from(game.clients)[i].send(`trade domestic ${args[2]} ${args[3]} ${args[4]} ${args[5]} ${args[6]}`);
                            }
                        }
                        ws.send('notification Trade offer sent to ' + player.name);
                        log(args[2] + ' offered ' + stringifyTrade(you, them) +  ' to ' + player.name);
                    }
                    else {
                        let players = JSON.parse(args[4]);
                        for (let i = 0; i < game.players.size; i++) {
                            if (Array.from(game.players)[i].name === args[2]) {
                                continue;
                            }
                            if (!players.includes(Array.from(game.players)[i].name)) {
                                continue;
                            }

                            Array.from(game.clients)[i].send(`trade domestic ${args[2]} ${args[3]} ${args[4]} ${args[5]} ${args[6]}`);
                        }
                        if (players.length ===  game.players.size - 1) {
                            ws.send('notification Trade offer sent to everyone');
                            log(player.name + ' offered ' + stringifyTrade(you, them) + ' to everyone');
                        }
                        else {
                            ws.send('notification Trade offer sent to ' + joinWithAnd(players));
                            log(player.name + ' offered ' + stringifyTrade(you, them) + ' to ' + joinWithAnd(players));
                        }
                    }
                }
                else if (args[1] === 'maritime') {
                    let you = JSON.parse(args[2]);
                    let them = JSON.parse(args[3]);

                    if (!isTradeLegal(you, them)) {
                        return;
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

                    for (let i = 2; i <= 4; i++) {
                        if (i == 2) {
                            let hasHarbors = true;
                            for (let key of Object.keys(you)) {
                                if (!player.harbors.includes(key)) {
                                    hasHarbors = false;
                                }
                            }
                            if (!hasHarbors) {
                                continue;
                            }
                        }
                        else if (i == 3 && !player.harbors.includes("generic")) {
                            continue;
                        }
                        if (isRatio(you, them, i)) {
                            log(player.name + ' maritime traded ' + stringifyTrade(you, them));
                            player.subtractResources(you);
                            player.addResources(them);
                            broadcastPlayers();
                            return;
                        }
                    }

                    ws.send('error Invalid maritime trade');
                }
                else if (args[1] === 'accept') {
                    let you = Array.from(game.players).find(player => player.name === args[2]);
                    let them = Array.from(game.players).find(player => player.name === args[4]);
                    for (const [key, value] of Object.entries(JSON.parse(args[3]))) {
                        you.resources[key] = you.resources[key] - value;
                        them.resources[key] = them.resources[key] + value;
                    }
                    for (const [key, value] of Object.entries(JSON.parse(args[5]))) {
                        you.resources[key] = you.resources[key] + value;
                        them.resources[key] = them.resources[key] - value;
                    }
                    log(you.name + ' and ' + them.name + ' traded ' + stringifyTrade(JSON.parse(args[3]), JSON.parse(args[5])));
                    broadcastPlayers();
                    broadcast(`trade unoffer ${args[6]}`)
                }
            }
            else if (args[0] === 'develop') {
                const costs = {
                    grain: 1,
                    ore: 1,
                    wool: 1
                }
                // check if it is past the initial phase
                if (game.round < 2) {
                    ws.send('error You may not develop during the initial phase');
                    return;
                }
                // check if player has resources
                if (!player.hasResources(costs)) {
                    ws.send('error Insufficient resources');
                    return;
                }
                if (developments.length === 0) {
                    ws.send('error No developments left');
                    return;
                }
                log(player.name + ' developed');
                player.developments[developments.shift()]++;
                player.subtractResources(costs);
                broadcastPlayers();
            }
            else if (args[0] === 'progress') {
                if (args[1] === 'monopoly') {
                    // check if player has monopoly card
                    if (player.developments["monopoly"] === 0) {
                        ws.send('error No monopoly cards left');
                        return;
                    }
                    log (player.name + ' used monopoly for ' + args[2]);
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

                    roadBuilding = true;
                    log (player.name + ' used road building');
                }   
                player.developments[args[1]]--;
                broadcastPlayers();
            }
            else if (args[0] === 'knight') {
                // check if player has knight card
                if (player.developments["knight"] === 0) {
                    ws.send('error No knight cards left');
                    return;
                }
                if (args.length === 1) {
                    log(player.name + ' used a knight');
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
                else {
                    let victim = Array.from(game.players).find(player => player.name === args[1]);
                    const randomResource = victim.randomResource();
                    victim.resources[randomResource]--;
                    player.resources[randomResource]++;
                }
                broadcastPlayers();
            }
            else if (args[0] === 'build') {
                const row = parseInt(args[2]);
                const col = parseInt(args[3]);
                if (args[1] === 'settlement') {
                    const costs = {
                        brick: 1,
                        grain: 1,
                        lumber: 1,
                        wool: 1
                    }

                    if (game.round < 2) {
                        // check if it's the player's turn
                        if (Array.from(game.clients).indexOf(ws) !== game.turn % game.players.size) {
                            ws.send('error It is not your turn');
                            return;
                        }
                        // check if settlement is legal
                        if (!isNaN(points.settlementVertices[row][col])) {
                            ws.send('error Illegal settlement placement');
                            return;
                        }
                        // check if player already built a settlement this round
                        if (game.round < 2 && player.buildings["settlements"] < 5 - game.round) {
                            ws.send(`error You may only build one settlement during round ${["one", "two"][game.round]}`);
                            return;
                        }
                        player.prevVertex = [row, col];

                        let adjacentEdges = Vertex.adjacentEdges(row, col);
                        for (let j = 0; j < adjacentEdges.length; j++) {
                            const edge = adjacentEdges[j];
                            if (isNaN(points.roadEdges[edge[0]][edge[1]])) {
                                points.roadEdges[edge[0]][edge[1]] = [game.round === 1 ? game.players.size - 1 - (game.turn % game.players.size) : game.turn % game.players.size];
                            }
                            else if (points.roadEdges[edge[0]][edge[1]] != (game.round === 1 ? game.players.size - 1 - (game.turn % game.players.size) : game.turn % game.players.size)) {
                                points.roadEdges[edge[0]][edge[1]].push(game.round === 1 ? game.players.size - 1 - (game.turn % game.players.size) : game.turn % game.players.size)
                            }
                        }

                        // give player resources on round two
                        if (game.round === 1) {
                            const adjacentTiles = Vertex.adjacentTiles(row, col);
                            for (let j = 0; j < adjacentTiles.length; j++) {
                                const tile = adjacentTiles[j];
                                if (map.terrainMap[tile[0]][tile[1]] !== "Desert") {
                                    player.resources[terrainToResource[map.terrainMap[tile[0]][tile[1]]]]++;
                                }
                            }
                        }
                    }
                    else if (game.turn >= game.players.size * 2) {
                        // check if player has resources
                        if (!player.hasResources(costs)) {
                            ws.send('error Insufficient resources');
                            return;
                        }
                        // check if player has settlements
                        if (player.buildings["settlements"] == 0) {
                            ws.send('error No settlements left');
                            return;
                        }
                        // check if settlement is legal
                        if (!points.settlementVertices[row][col].includes(game.turn % game.players.size)) {
                            ws.send('error Illegal settlement placement');
                            return;
                        }
                        // check if road building is active
                        if (roadBuilding) {
                            ws.send('error Road building is active');
                            return;
                        }
                        player.subtractResources(costs);
                    }
                    broadcast(String(message));
                    log(player.name + ' built a settlement');
                    player.points++;
                    player.buildings["settlements"]--;
                    points.settlementVertices[row][col] = game.players.size;
                    buildings.settlements[row][col] = game.round === 1 ? game.players.size - 1 - (game.turn % game.players.size) : game.turn % game.players.size;
                    points.cityVertices[row][col] = game.round === 1 ? game.players.size - 1 - (game.turn % game.players.size) : game.turn % game.players.size;

                    // check if settlement is placed on a harbor
                    const adjacentEdges = Vertex.adjacentEdges(row, col);
                    for (let i = 0; i < adjacentEdges.length; i++) {
                        const edge = adjacentEdges[i];
                        if (map.harborMap[edge[0]][edge[1]] != 0) {
                            player.harbors.push(map.harborMap[edge[0]][edge[1]]);
                        }
                    }

                    const adjacentVertices = Vertex.adjacentVertices(row, col);
                    for (let i = 0; i < adjacentVertices.length; i++) {
                        points.settlementVertices[adjacentVertices[i][0]][adjacentVertices[i][1]] = game.players.size + 1;
                    }
                }
                else if (args[1] === 'city') {
                    const costs = {
                        grain: 2,
                        ore: 3
                    }
                    // check if it is past the initial phase
                    if (game.round < 2) return;
                    // check if player has resources
                    if (!player.hasResources(costs)) {
                        ws.send('error Insufficient resources');
                        return;
                    }
                    // check if player has cities
                    if (player.buildings["cities"] == 0) {
                        ws.send('error No cities left');
                        return;
                    }
                    // check if city is legal
                    if (points.cityVertices[row][col] != game.turn % game.players.size) {
                        ws.send('error Illegal city placement');
                        return;
                    }
                    // check if road building is active
                    if (roadBuilding) {
                        ws.send('error Road building is active');
                        return;
                    }

                    broadcast(String(message));
                    log(player.name + ' built a city');
                    player.points++;
                    player.buildings["cities"]--;
                    player.buildings["settlements"]++;
                    player.subtractResources(costs);
                    buildings.cities[row][col] = game.turn % game.players.size;
                    buildings.settlements[row][col] = NaN;
                    points.cityVertices[row][col] = NaN;
                }
                else if (args[1] === 'road') {
                    const costs = {
                        brick: 1,
                        lumber: 1
                    }
                    // check if road is legal
                    if (game.round < 2) {
                        if (player.buildings["settlements"] > 4 - game.round) {
                            ws.send('error You must build a settlement first');
                            return;
                        }
                        if (player.buildings["roads"] < 15 - game.round) {
                            ws.send(`error You may only build one road during round ${["one", "two"][game.round]}`);
                            return;
                        }
                    }
                    if (game.round === 1) {
                        let playerEdges = Vertex.adjacentEdges(player.prevVertex[0], player.prevVertex[1]);
                        if (playerEdges.find(edge => edge[0] === row && edge[1] === col) === undefined) {
                            ws.send('error Illegal road placement');
                            return;
                        }
                    }
                    else {
                        if (!points.roadEdges[row][col].includes(game.turn % game.players.size)) {
                            ws.send('error Illegal road placement');
                            return;
                        }
                    }
                    if (game.round > 1) {
                        // check if player has resources
                        if (!player.hasResources(costs) && !roadBuilding) {
                            ws.send('error Insufficient resources');
                            return;
                        }
                        // check if player has roads
                        if (player.buildings["roads"] == 0) {
                            ws.send('error No roads left');
                            return;
                        }

                        if (roadBuilding) {
                            roadsBuilt++;
                            if (roadsBuilt === 2) {
                                roadBuilding = false;
                                roadsBuilt = 0;
                            }
                        }
                        else {
                            player.subtractResources(costs);
                        }
                    }

                    broadcast(String(message));
                    log(player.name + ' built a road');
                    player.buildings["roads"]--;
                    points.roadEdges[row][col] = game.players.size;
                    buildings.roads[row][col] = game.turn % game.players.size;

                    // Update longest road
                    let road = longestRoad();
                    console.log("longestRoad: " + road.player.name + " " + road.length);
                    if (road.length >= 5) {
                        for (let i = 0; i < game.players.size; i++) {
                            if (getPlayerArray()[i].specials["longestRoad"]) {
                                getPlayerArray()[i].specials["longestRoad"] = false;
                                getPlayerArray()[i].points -= 2;
                            }
                        }
                        road.player.specials["longestRoad"] = true;
                        road.player.points += 2;
                    }

                    const adjacentVertices = Edge.adjacentVertices(row, col);
                    for (let i = 0; i < adjacentVertices.length; i++) {
                        const adjacentEdges = Vertex.adjacentEdges(adjacentVertices[i][0], adjacentVertices[i][1]);
                        for (let j = 0; j < adjacentEdges.length; j++) {
                            if (isNaN(points.roadEdges[adjacentEdges[j][0]][adjacentEdges[j][1]]) && !Array.isArray(points.roadEdges[adjacentEdges[j][0]][adjacentEdges[j][1]])) {
                                if (game.round === 1) {
                                    points.roadEdges[adjacentEdges[j][0]][adjacentEdges[j][1]] = [game.players.size - 1 - (game.turn % game.players.size)];
                                }
                                else {
                                    points.roadEdges[adjacentEdges[j][0]][adjacentEdges[j][1]] = [game.turn % game.players.size];
                                }
                            }
                            else if (points.roadEdges[adjacentEdges[j][0]][adjacentEdges[j][1]] != game.players.size && !points.roadEdges[adjacentEdges[j][0]][adjacentEdges[j][1]].includes(game.round === 1 ? game.players.size - 1 - (game.turn % game.players.size) : game.turn % game.players.size)) {
                                points.roadEdges[adjacentEdges[j][0]][adjacentEdges[j][1]].push(game.round === 1 ? game.players.size - 1 - (game.turn % game.players.size) : game.turn % game.players.size);
                            }
                        }
                        if (points.settlementVertices[adjacentVertices[i][0]][adjacentVertices[i][1]] == game.players.size) {
                            continue;
                        }
                        const vertices = Vertex.adjacentVertices(adjacentVertices[i][0], adjacentVertices[i][1]);
                        let available = true;
                        for (let j = 0; j < vertices.length; j++) {
                            if (points.settlementVertices[vertices[j][0]][vertices[j][1]] == game.players.size) {
                                available = false;
                            }
                        }
                        if (available) {
                            if (game.round === 1) {
                                if (Array.isArray(points.settlementVertices[adjacentVertices[i][0]][adjacentVertices[i][1]])) {
                                    points.settlementVertices[adjacentVertices[i][0]][adjacentVertices[i][1]].push(game.players.size - 1 - (game.turn % game.players.size))
                                }
                                else {
                                    points.settlementVertices[adjacentVertices[i][0]][adjacentVertices[i][1]] = [game.players.size - 1 - (game.turn % game.players.size)]
                                }
                            }
                            else {
                                if (Array.isArray(points.settlementVertices[adjacentVertices[i][0]][adjacentVertices[i][1]])) {
                                    points.settlementVertices[adjacentVertices[i][0]][adjacentVertices[i][1]].push(game.turn % game.players.size)
                                }
                                else {
                                    points.settlementVertices[adjacentVertices[i][0]][adjacentVertices[i][1]] = [game.turn % game.players.size];
                                }
                            }
                        }
                    }
                }

                broadcastPoints();
                broadcastPlayers();
            }
            else if (args[0] === 'get') {
                if (args[1] === 'map') {
                    ws.send('map ' + JSON.stringify(map));
                }
                else if (args[1] === 'points') {
                    broadcastPoints();
                }
                else if (args[1] === 'robber') {
                    ws.send(`robber ${robber[0]} ${robber[1]}`);
                }
            }
            else if (args[0] === 'robber') {
                if (roll === 7 || knight) {
                    robber = [parseInt(args[1]), parseInt(args[2])];

                    // check if robber is moved to desert
                    if (map.terrainMap[robber[0]][robber[1]] === "Desert") {
                        ws.send('error Robber cannot be moved to desert');
                        return;
                    }

                    if (knight) {
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

                        ws.send(`knight ${JSON.stringify(adjacentPlayers)}`);
                    }
                    broadcast(String(message));
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
                        log (player.name + ' ended their turn');
                        game.turn++;
                        game.round = Math.floor(game.turn / game.players.size);
                    }

                    Array.from(game.clients)[game.round === 1 ? game.players.size - 1 - (game.turn % game.players.size) : game.turn % game.players.size].send('start turn');
                }
                else {
                    log(player.name + ' ended their turn');
                    game.turn++;
                    game.round = Math.floor(game.turn / game.players.size);
                    // roll dice
                    Array.from(game.clients)[game.turn % game.players.size].send('start turn');
                    var roll = Math.floor(Math.random() * 6 + 1) + Math.floor(Math.random() * 6 + 1);
                    broadcast('roll ' + roll);

                    for (let i = 0; i < map.terrainMap.length; i++) {
                        for (let j = 0; j < map.terrainMap[i].length; j++) {
                            if (map.numberMap[i][j] === roll && (i != robber[0] || j != robber[1])) {
                                const vertices = Tile.adjacentVertices(i, j);
                                for (let k = 0; k < vertices.length; k++) {
                                    const settlement = buildings.settlements[vertices[k][0]][vertices[k][1]];
                                    const city = buildings.cities[vertices[k][0]][vertices[k][1]];
                                    if (!isNaN(settlement)) {
                                        const player = getPlayerArray()[settlement];
                                        player.resources[terrainToResource[map.terrainMap[i][j]]] += 1;
                                    }
                                    if (!isNaN(city)) {
                                        const player = getPlayerArray()[city];
                                        player.resources[terrainToResource[map.terrainMap[i][j]]] += 2;
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