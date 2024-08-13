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

    // debug #0 - check if the settlements and roads are being stored correctly
    console.log(buildings.settlements);
    console.log(buildings.roads);

    for (let i = 0; i < buildings.settlements.length; i++) {
        for (let j = 0; j < buildings.settlements[i].length; j++) {
            if (isNaN(buildings.settlements[i][j])) {
                continue;
            }
            let currentPlayer = buildings.settlements[i][j];
            let roadLength = countRoad(i, j, currentPlayer);

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
 * @param {number} [prevEdgeRow=-1] - The row index of the previous edge (optional).
 * @param {number} [prevEdgeCol=-1] - The column index of the previous edge (optional).
 * @returns {number} - The length of the road for the given player.
 */
function countRoad(row, col, player, prevEdgeRow = -1, prevEdgeCol = -1) {
    let nextRoads = [];
    let adjacentEdges = Vertex.adjacentEdges(row, col);

    for (let edge of adjacentEdges) {
        if (buildings.roads[edge[0]][edge[1]] === player && !(edge[0] === prevEdgeRow && edge[1] === prevEdgeCol)) {
            nextRoads.push(edge);
        }
    }

    if (nextRoads.length === 0) return 0;

    let roadLengths = nextRoads.map(edge => {
        let adjacentVertices = Edge.adjacentVertices(edge[0], edge[1]);
        let maxLength = 1;

        for (let vertex of adjacentVertices) {
            if (!isNaN(buildings.settlements[vertex[0]][vertex[1]]) && buildings.settlements[vertex[0]][vertex[1]] !== player) {
                continue;
            }
            else if (vertex[0] !== row || vertex[1] !== col) {
                maxLength += countRoad(vertex[0], vertex[1], player, edge[0], edge[1]);
            }
        }

        return maxLength;
    });

    let firstMax = Math.max(...roadLengths);
    let secondMax = roadLengths.length > 1 ? Math.max(...roadLengths.filter(length => length !== firstMax)) : 0;

    return prevEdgeCol === -1 ? firstMax + secondMax : firstMax;
}