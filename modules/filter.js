import { game, points, getPlayerArray } from '../index.js';
import { Vertex } from './geometry.js';

export function filterSettlements(player) {
    const playerSettlementVertices = [];
    for (let j = 0; j < points.settlementVertices.length; j++) {
        playerSettlementVertices.push([]);
        for (let k = 0; k < points.settlementVertices[j].length; k++) {
            if (game.round < 2) {
                playerSettlementVertices[j].push(isNaN(points.settlementVertices[j][k]));
            }
            else {
                if (Array.isArray(points.settlementVertices[j][k])) {
                    playerSettlementVertices[j].push(points.settlementVertices[j][k].includes(player));
                }
                else {
                    playerSettlementVertices[j].push(false);
                }
            }
        }
    }
    return playerSettlementVertices;
}

export function filterCities(player) {
    const playerCityVertices = [];
    for (let j = 0; j < points.cityVertices.length; j++) {
        playerCityVertices.push([]);
        for (let k = 0; k < points.cityVertices[j].length; k++) {
            playerCityVertices[j].push(points.cityVertices[j][k] == player);
        }
    }
    return playerCityVertices;
}

export function filterRoads(player) {
    if (game.turn >= game.players.size && game.round < 2 && getPlayerArray()[player].prevVertex != null) {
        var playerEdges = [];
        for (let j = 0; j < points.roadEdges.length; j++) {
            playerEdges.push([]);
            for (let k = 0; k < points.roadEdges[j].length; k++) {
                playerEdges[j].push(false);
            }
        }
        let temp = Vertex.adjacentEdges(getPlayerArray()[player].prevVertex[0], getPlayerArray()[player].prevVertex[1]);
        for (let j = 0; j < temp.length; j++) {
            playerEdges[temp[j][0]][temp[j][1]] = true;
        }
    }
    else {
        playerEdges = [];
        for (let j = 0; j < points.roadEdges.length; j++) {
            playerEdges.push([]);
            for (let k = 0; k < points.roadEdges[j].length; k++) {
                if (Array.isArray(points.roadEdges[j][k])) {
                    playerEdges[j].push(points.roadEdges[j][k].includes(player));
                }
                else {
                    playerEdges[j].push(false);
                }
            }
        }
    }
    return playerEdges;
}