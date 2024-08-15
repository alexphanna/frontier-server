import { buildings, getPlayerArray } from '../index.js';
import { Vertex, Edge } from './geometry.js';

/**
 * Calculates the length of the longest road in the game.
 * 
 * @returns {Object} An object containing the length of the longest road and the player who owns it.
 */

let prevEdges = [];
let loops = 0;

export default function longestRoad() {
    let maxLength = 0;
    let longestPlayer = null;

    for (let i = 0; i < buildings.settlements.length; i++) {
        for (let j = 0; j < buildings.settlements[i].length; j++) {
            if (isNaN(buildings.settlements[i][j]) && isNaN(buildings.cities[i][j])) {
                continue;
            }
            let currentPlayer = isNaN(buildings.settlements[i][j]) ? buildings.cities[i][j] : buildings.settlements[i][j];
            let roadLength = countRoad(i, j, currentPlayer) - Math.floor(loops) - (loops > 1 ? 1 : 0);
            prevEdges = [];
            loops = 0;

            // debug #1 - check if the road length is calculated correctly
            console.log(`${i}, ${j}  road length: ${roadLength}`);

            if (roadLength > maxLength) {
                maxLength = roadLength;
                longestPlayer = getPlayerArray()[currentPlayer];
            }
        }
    }

    return { length: maxLength, player: longestPlayer };
}

/**
 * Counts the length of the road for a given player starting from a specific row and column.
 * 
 * @param {number} row - The row index of the starting position.
 * @param {number} col - The column index of the starting position.
 * @param {string} player - The player for whom the road length is being counted.
 * @param {Array} prevEdges - The edges that have already been visited.
 * @returns {number} - The length of the road for the given player.
 */

function countRoad(row, col, player, prevEdgeRow = -1, prevEdgeCol = -1) {
    let nextRoads = [];
    let adjacentEdges = Vertex.adjacentEdges(row, col);

    let settlementsAndCities = [];
    for (let i = 0; i < buildings.settlements.length; i++) {
        settlementsAndCities.push([]);
        for (let j = 0; j < buildings.settlements[i].length; j++) {
            if (!isNaN(buildings.settlements[i][j])) {
                settlementsAndCities[i].push(buildings.settlements[i][j]);
            }
            else if (!isNaN(buildings.cities[i][j])) {
                settlementsAndCities[i].push(buildings.cities[i][j]);
            }
            else {
                settlementsAndCities[i].push(NaN);
            }
        }
    }

    for (let edge of adjacentEdges) {
        if (edge[0] === prevEdgeRow && edge[1] === prevEdgeCol) {
            continue;
        }
        let edgeVisited = false;
        for (let prevEdge of prevEdges) {
            if (edge[0] === prevEdge[0] && edge[1] === prevEdge[1]) {
                edgeVisited = true;
                loops += 1 / Math.floor(loops + 2);
            }
        }
        if (!edgeVisited && buildings.roads[edge[0]][edge[1]] === player) {
            nextRoads.push(edge);
        }
    }

    if (nextRoads.length === 0) return 0;

    let roadLengths = nextRoads.map(edge => {
        let adjacentVertices = Edge.adjacentVertices(edge[0], edge[1]);
        let maxLength = 1;

        for (let vertex of adjacentVertices) {
            if (!isNaN(settlementsAndCities[vertex[0]][vertex[1]]) && settlementsAndCities[vertex[0]][vertex[1]] !== player) {
                continue;
            }
            else if (vertex[0] !== row || vertex[1] !== col) {
                prevEdges = prevEdges.concat([[edge[0], edge[1]]]);
                maxLength += countRoad(vertex[0], vertex[1], player, edge[0], edge[1]);
            }
        }

        return maxLength;
    });

    roadLengths = roadLengths.sort((a, b) => b - a);
    let firstMax = roadLengths[0];
    let secondMax = roadLengths.length > 1 ? roadLengths[1] : 0;

    console.log(firstMax, secondMax, Math.floor(loops));
    // solution:
    // if the road is a loop, the length has to be subtracted by the (number of loops * 2) - 1
    return firstMax + secondMax;
}