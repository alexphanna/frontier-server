import { buildings, getPlayerArray } from '../index.js';
import { Vertex, Edge } from './geometry.js';

/**
 * Calculates the length of the longest road in the game.
 * 
 * @returns {Object} An object containing the length of the longest road and the player who owns it.
 */

export default function longestRoad() {
    let maxLength = 0;
    let longestPlayer = null;

    for (let i = 0; i < buildings.settlements.length; i++) {
        for (let j = 0; j < buildings.settlements[i].length; j++) {
            if (isNaN(buildings.settlements[i][j]) && isNaN(buildings.cities[i][j])) continue;
            let currentPlayer = isNaN(buildings.settlements[i][j]) ? buildings.cities[i][j] : buildings.settlements[i][j];
            let roads = removeDuplicates(getRoads(i, j, currentPlayer));

            for (let i = 0; i < roads.length; i++) {
                for (let j = i; j < roads.length; j++) {
                    let length = 0;
                    if (i === j) length = roads[i].length;
                    else if (i !== j) {
                        let overlappingRoads = overlap(roads[i], roads[j]);
                        let endOverlap = true;
                        for (let k = 0; k < overlappingRoads.length; k++) {
                            if (!overlappingRoads.includes(roads[i][roads[i].length - 1 - k]) && !overlappingRoads.includes(roads[j][roads[j].length - 1 - k])) {
                                endOverlap = false;
                                break;
                            }
                        }
                        if (!endOverlap) continue;

                        length = roads[i].length + roads[j].length - overlappingRoads.length;
                    }
                    if (length > maxLength) {
                        maxLength = length;
                        longestPlayer = getPlayerArray()[currentPlayer];
                    }
                }
            }
        }
    }

    return { length: maxLength, player: longestPlayer };
}

function overlap(firstRoad, secondRoad) {
    let overlappingRoads = [];
    for (let road1 of firstRoad) {
        for (let road2 of secondRoad) {
            if (road1[0] === road2[0] && road1[1] === road2[1]) {
                overlappingRoads.push(road1);
            }
        }
    }
    return overlappingRoads;
}

function removeDuplicates(roads) {
    for (let i = 0; i < roads.length; i++) {
        for (let j = i + 1; j < roads.length; j++) {
            if (roads[i].length !== roads[j].length) continue;
            let duplicate = true;
            for (let road of roads[i]) {
                let includesRoad = false;
                for (let road2 of roads[j]) {
                    if (road[0] === road2[0] && road[1] === road2[1]) {
                        includesRoad = true;
                        break;
                    }
                }
                if (!includesRoad) {
                    duplicate = false;
                    break;
                }
            }

            if (duplicate) {
                roads.splice(j, 1);
                j--;
            }
        }
    }

    return roads;
}

function getRoads(row, col, player, roads = []) {
    let settlementsAndCities = getSettlementsAndCities();
    if (!isNaN(settlementsAndCities[row][col]) && settlementsAndCities[row][col] !== player) return [roads];

    let nextRoads = getNextRoads(row, col, player, roads);
    let combinations = [];

    for (let road of nextRoads) {
        const vertices = Edge.adjacentVertices(road[0], road[1]);

        for (let vertex of vertices) {
            if (vertex[0] === row && vertex[1] === col) continue;
            combinations = combinations.concat(getRoads(vertex[0], vertex[1], player, roads.concat([road])));
        }
    }

    if (combinations.length === 0) return [roads];
    return combinations;
}

function getNextRoads(row, col, player, prevEdges) {
    let nextRoads = [];
    let adjcaentEdges = Vertex.adjacentEdges(row, col);

    for (let edge of adjcaentEdges) {
        let edgeFound = false;
        for (let prevEdge of prevEdges) {
            if (prevEdge[0] === edge[0] && prevEdge[1] === edge[1]) {
                edgeFound = true;
                break;
            }
        }
        if (edgeFound) continue;
        if (buildings.roads[edge[0]][edge[1]] === player) nextRoads.push(edge);
    }

    return nextRoads;
}

function getSettlementsAndCities() {
    let settlementsAndCities = [];

    for (let i = 0; i < buildings.settlements.length; i++) {
        settlementsAndCities.push([]);
        for (let j = 0; j < buildings.settlements[i].length; j++) {
            settlementsAndCities[i].push(isNaN(buildings.settlements[i][j]) ? buildings.cities[i][j] : buildings.settlements[i][j]);
        }
    }

    return settlementsAndCities;
}