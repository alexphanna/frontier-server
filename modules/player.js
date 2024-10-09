import { game, points, buildings, terrainToResource } from '../index.js';
import broadcast, { log } from './broadcast.js';
import { Vertex, Edge } from './geometry.js';
import longestRoad from './longest-road.js';

export default class Player {
    constructor(name, color) {
        this.name = name;
        this.color = color;
        this.points = 0;
        this.prevVertex = null;
        this.buildings = {
            settlements: 5,
            cities: 4,
            roads: 15
        }
        this.specials = {
            longestRoad: false,
            largestArmy: false
        }
        this.resources = {
            brick: 0,
            grain: 0,
            lumber: 0,
            ore: 0,
            wool: 0
        };
        this.developments = {
            knight: 0,
            monopoly: 0,
            yearOfPlenty: 0,
            roadBuilding: 0,
            victoryPoint: 0
        };
        this.army = 0;
        this.harbors = [];

        this.roadBuilding = false;
        this.roadsBuilt = 0;
    }
    get client() {
        return Array.from(game.clients)[Array.from(game.players).indexOf(this)];
    }
    buildRoad(row, col, angle) {
        const costs = {
            brick: 1,
            lumber: 1
        }

        // check if road is legal
        if (game.round < 2) {
            if (this.buildings["settlements"] > 4 - game.round) {
                this.client.send('error You must build a settlement first');
                return;
            }
            if (this.buildings["roads"] < 15 - game.round) {
                this.client.send(`error You may only build one road during round ${["one", "two"][game.round]}`);
                return;
            }
        }
        if (game.round === 1) {
            let playerEdges = Vertex.adjacentEdges(this.prevVertex[0], this.prevVertex[1]);
            if (playerEdges.find(edge => edge[0] === row && edge[1] === col) === undefined) {
                this.client.send('error Illegal road placement');
                return;
            }
        }
        else {
            if (!points.roadEdges[row][col].includes(game.turn % game.players.size)) {
                this.client.send('error Illegal road placement');
                return;
            }
        }
        if (game.round > 1) {
            // check if player has resources
            if (!this.hasResources(costs) && !this.roadBuilding) {
                this.client.send('error Insufficient resources');
                return;
            }
            // check if player has roads
            if (this.buildings["roads"] == 0) {
                this.client.send('error No roads left');
                return;
            }

            if (this.roadBuilding) {
                this.roadsBuilt++;
                if (this.roadsBuilt === 2) {
                    this.roadBuilding = false;
                    this.roadsBuilt = 0;
                }
            }
            else {
                this.subtractResources(costs);
            }
        }

        broadcast(`build road ${row} ${col} ${angle} ${this.color}`);
        log(this.name + ' built a road');
        this.buildings["roads"]--;
        points.roadEdges[row][col] = game.players.size;
        buildings.roads[row][col] = (game.round === 1 ? game.players.size - 1 - (game.turn % game.players.size) : game.turn % game.players.size);

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

        longestRoad();
    }
    buildSettlement(row, col) {
        const costs = {
            brick: 1,
            grain: 1,
            lumber: 1,
            wool: 1
        }

        // check if it is the player's turn
        if (Array.from(game.clients).indexOf(this.client) !== (game.round === 1 ? game.players.size - 1 - (game.turn % game.players.size) : game.turn % game.players.size)) {
            this.client.send('error It is not your turn');
            return;
        }

        if (game.round < 2) {
            // check if settlement is legal
            if (!isNaN(points.settlementVertices[row][col])) {
                this.client.send('error Illegal settlement placement');
                return;
            }

            // check if player already built a settlement this round
            if (game.round < 2 && this.buildings["settlements"] < 5 - game.round) {
                this.client.send(`error You may only build one settlement during round ${["one", "two"][game.round]}`);
                return;
            }
            this.prevVertex = [row, col];

            let adjacentEdges = Vertex.adjacentEdges(row, col);
            for (let j = 0; j < adjacentEdges.length; j++) {
                const edge = adjacentEdges[j];
                if (isNaN(points.roadEdges[edge[0]][edge[1]])) {
                    points.roadEdges[edge[0]][edge[1]] = [game.round === 1 ? game.players.size - 1 - (game.turn % game.players.size) : game.turn % game.players.size];
                }
                else if (!points.roadEdges[edge[0]][edge[1]].includes(game.round === 1 ? game.players.size - 1 - (game.turn % game.players.size) : game.turn % game.players.size)) {
                    points.roadEdges[edge[0]][edge[1]].push(game.round === 1 ? game.players.size - 1 - (game.turn % game.players.size) : game.turn % game.players.size)
                }
            }

            // give player resources on round two
            if (game.round === 1) {
                const adjacentTiles = Vertex.adjacentTiles(row, col);
                for (let j = 0; j < adjacentTiles.length; j++) {
                    const tile = adjacentTiles[j];
                    if (game.map.terrainMap[tile[0]][tile[1]] !== "Desert") {
                        this.resources[terrainToResource[game.map.terrainMap[tile[0]][tile[1]]]]++;
                    }
                }
            }
        }
        else if (game.turn >= game.players.size * 2) {
            // check if settlement is legal
            if (!points.settlementVertices[row][col].includes(game.turn % game.players.size)) {
                this.client.send('error Illegal settlement placement');
                return;
            }
            // check if player has resources
            if (!this.hasResources(costs)) {
                this.client.send('error Insufficient resources');
                return;
            }
            // check if player has settlements
            if (this.buildings["settlements"] == 0) {
                this.client.send('error No settlements left');
                return;
            }
            // check if road building is active
            if (this.roadBuilding) {
                this.client.send('error Road building is active');
                return;
            }
            this.subtractResources(costs);
        }
        broadcast(`build settlement ${row} ${col} ${this.color}`);
        log(this.name + ' built a settlement');
        this.points++;
        this.buildings["settlements"]--;
        points.settlementVertices[row][col] = game.players.size;
        buildings.settlements[row][col] = (game.round === 1 ? game.players.size - 1 - (game.turn % game.players.size) : game.turn % game.players.size);
        points.cityVertices[row][col] = (game.round === 1 ? game.players.size - 1 - (game.turn % game.players.size) : game.turn % game.players.size);

        // check if settlement is placed on a harbor
        const adjacentEdges = Vertex.adjacentEdges(row, col);
        for (let i = 0; i < adjacentEdges.length; i++) {
            const edge = adjacentEdges[i];
            if (game.map.harborMap[edge[0]][edge[1]] != 0) {
                this.harbors.push(game.map.harborMap[edge[0]][edge[1]]);
            }
        }

        const adjacentVertices = Vertex.adjacentVertices(row, col);
        for (let i = 0; i < adjacentVertices.length; i++) {
            points.settlementVertices[adjacentVertices[i][0]][adjacentVertices[i][1]] = game.players.size + 1;
        }

        longestRoad();
    }
    buildCity(row, col) {
        const costs = {
            grain: 2,
            ore: 3
        }

        // check if it is past the initial phase
        if (game.round < 2) return;
        // check if player has resources
        if (!this.hasResources(costs)) {
            this.client.send('error Insufficient resources');
            return;
        }
        // check if player has cities
        if (this.buildings["cities"] == 0) {
            this.client.send('error No cities left');
            return;
        }
        // check if city is legal
        if (points.cityVertices[row][col] != game.turn % game.players.size) {
            this.client.send('error Illegal city placement');
            return;
        }
        // check if road building is active
        if (this.roadBuilding) {
            this.client.send('error Road building is active');
            return;
        }

        broadcast(`build city ${row} ${col} ${this.color}`);
        log(this.name + ' built a city');
        this.points++;
        this.buildings["cities"]--;
        this.buildings["settlements"]++;
        this.subtractResources(costs);
        buildings.cities[row][col] = game.turn % game.players.size;
        buildings.settlements[row][col] = NaN;
        points.cityVertices[row][col] = NaN;
    }
    develop() {
        const costs = {
            grain: 1,
            ore: 1,
            wool: 1
        }
        // check if it is past the initial phase
        if (game.round < 2) {
            this.client.send('error You may not develop during the initial phase');
            return;
        }
        // check if player has resources
        if (!this.hasResources(costs)) {
            this.client.send('error Insufficient resources');
            return;
        }
        if (game.developments.length === 0) {
            this.client.send('error No developments left');
            return;
        }
        log(this.name + ' developed');
        this.developments[game.developments.shift()]++;
        this.subtractResources(costs);
    }
    randomResource() {
        const flatResources = Object.entries(this.resources).flatMap(([key, value]) => Array(value).fill(key));
        return flatResources[Math.floor(Math.random() * flatResources.length)];
    }
    addResources(resources) {
        for (const [key, value] of Object.entries(resources)) {
            this.resources[key] += value;
        }
    }
    subtractResources(resources) {
        for (const [key, value] of Object.entries(resources)) {
            this.resources[key] -= value;
        }
    }
    hasResources(resources) {
        for (const [key, value] of Object.entries(resources)) {
            if (this.resources[key] < value) {
                return false;
            }
        }
        return true;
    }
}
export class PublicPlayer {
    constructor(player) {
        this.name = player.name;
        this.color = player.color;
        this.points = player.points;
        this.specials = player.specials;
        this.resources = Object.values(player.resources).reduce((a, b) => a + b, 0);
        this.developments = Object.values(player.developments).reduce((a, b) => a + b, 0);
        this.army = player.army;
    }
}