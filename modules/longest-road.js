import { buildings, getPlayerArray } from '../index.js';
import { Vertex, Edge } from './geometry.js';

/**
 * Calculates the length of the longest road in the game.
 * 
 * @returns {Object} An object containing the length of the longest road and the player who owns it.
 */

export default function longestRoad() {
    // last things to to with longestRoad later:
    // check for buildings in road

    let maxLength = 0;
    let longestPlayer = null;

    for (let i = 0; i < buildings.settlements.length; i++) {
        for (let j = 0; j < buildings.settlements[i].length; j++) {
            if (isNaN(buildings.settlements[i][j]) && isNaN(buildings.cities[i][j])) {
                continue;
            }
            let currentPlayer = isNaN(buildings.settlements[i][j]) ? buildings.cities[i][j] : buildings.settlements[i][j];
            let roads = removeDuplicates(getRoads(i, j, currentPlayer));

            let length = 0;

            for (let i = 0; i < roads.length; i++) {
                for (let j = i + 1; j < roads.length; j++) {
                    let overlappingRoads = overlap(roads[i], roads[j]);
                    if (overlappingRoads.length > 1) {
                        continue;
                    }
                    if (overlappingRoads.length === 1 && roads[i].indexOf(overlappingRoads[0]) !== roads[i].length - 1 && roads[j].indexOf(overlappingRoads[0]) !== roads[j].length - 1) {
                        continue;
                    }

                    length = roads[i].length + roads[j].length - overlappingRoads.length;
                    if (length > maxLength) {
                        maxLength = length;
                        longestPlayer = getPlayerArray()[currentPlayer];
                    }
                }
            }

            // if there are no roads that don't overlap
            if (length == 0) {
                for (let i = 0; i < roads.length; i++) {
                    for (let j = i; j < roads.length; j++) {
                        let uniqueRoads = [];
                        for (let road of roads[i].concat(roads[j])) {
                            let edgeFound = false;
                            for (let uniqueRoad of uniqueRoads) {
                                if (uniqueRoad[0] === road[0] && uniqueRoad[1] === road[1]) {
                                    edgeFound = true;
                                    break;
                                }
                            }
                            if (!edgeFound) {
                                uniqueRoads.push(road);
                            }
                        }

                        if (uniqueRoads.length > maxLength) {
                            maxLength = uniqueRoads.length;
                            longestPlayer = getPlayerArray()[currentPlayer];
                        }
                    }
                }
            }

            console.log("length: " + maxLength);
            console.log("player: " + longestPlayer);
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
            if (roads[i].length !== roads[j].length) {
                continue;
            }
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
    let nextRoads = getNextRoads(row, col, player, roads);

    let combinations = [];

    for (let road of nextRoads) {
        const vertices = Edge.adjacentVertices(road[0], road[1]);

        for (let vertex of vertices) {
            if (vertex[0] === row && vertex[1] === col) {
                continue;
            }

            combinations = combinations.concat(getRoads(vertex[0], vertex[1], player, roads.concat([road])));
        }
    }

    if (combinations.length === 0) {
        return [roads];
    }
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
        if (edgeFound) {
            continue;
        }
        if (buildings.roads[edge[0]][edge[1]] === player) {
            nextRoads.push(edge);
        }
    }

    return nextRoads;
}