import { points } from "../server.js";

export class Vertex {
    static adjacentEdges(row, col) {
        let edges = [];

        // left and right
        for (let i = (col == 0 ? 0 : -1); i <= (col == points.settlementVertices[row].length - 1 ? 0 : 1); i++) {
            edges.push([row * 2, col + (i > 0 ? 0 : -1)]);
        }

        // top and bottom
        if (row <= 2 && row >= 0) {
            edges.push([row * 2 + (col % 2 == 1 ? -1 : 1), Math.floor(col / 2)]);
        }
        else if (row >= 3 && row < points.settlementVertices.length - 1) {
            edges.push([row * 2 + (col % 2 == 1 ? 1 : -1), Math.floor(col / 2)]);
        }

        // remove negatives
        edges = edges.filter(edge => edge[0] >= 0 && edge[1] >= 0);

        // remove repeats
        for (let i = 0; i < edges.length; i++) {
            for (let j = i + 1; j < edges.length; j++) {
                if (edges[i][0] === edges[j][0] && edges[i][1] === edges[j][1]) {
                    edges.splice(j, 1);
                }
            }
        }

        return edges;
    }
    static adjacentVertices(row, col) {
        let adjacentVertices = [];

        const edges = Vertex.adjacentEdges(row, col);
        for (let i = 0; i < edges.length; i++) {
            const vertices = Edge.adjacentVertices(edges[i][0], edges[i][1]);
            for (let j = 0; j < vertices.length; j++) {
                if (vertices[j][0] != row || vertices[j][1] != col) {
                    adjacentVertices.push(vertices[j]);
                }
            }
        }

        return adjacentVertices;
    }
    static adjacentTiles(row, col) {
        let adjacentTiles = [];
        
        adjacentTiles.push([row, Math.floor(col / 2) - (row <= 2 ? 0 : 1)]);
        if ((col % 2 == 0 && row <= 2) || (col % 2 == 1 && row >= 3)) {
            adjacentTiles.push([row, Math.floor(col / 2) - 1]);
            adjacentTiles.push([row - 1, Math.floor(col / 2) - (row <= 2 ? 1 : 0)]);
        }
        else {
            adjacentTiles.push([row - 1, Math.floor(col / 2) - (row <= 2 ? 0 : 1)]);
            adjacentTiles.push([row - 1, Math.floor(col / 2) - (row <= 2 ? 0 : 1) + 1]);
        }
        adjacentTiles = adjacentTiles.filter(tile => tile[0] >= 0 && tile[0] < 5 && tile[1] >= 0 && tile[1] < 5); // 5 can't be constant

        return adjacentTiles;
    }
}
export class Edge {
    // always returns 2 vertices
    static adjacentVertices(row, col) {
        let vertices = [];

        if (row % 2 == 0) {
            // horizontal row
            vertices.push([Math.floor(row / 2), col]);
            vertices.push([Math.floor(row / 2), col + 1]);
        }
        else {
            // vertical row
            vertices.push([Math.floor(row / 2), col * 2 + (row > 5 ? 1 : 0)]);
            vertices.push([Math.ceil(row / 2), col * 2 + (row < 5 ? 1 : 0)]);
        }

        return vertices;
    }
}
export class Tile {
    static adjacentVertices(row, col) {
        let vertices = [];

        for (let i = 0; i < 3; i++) {
            vertices.push([row, col * 2 + i + (row > 2 ? 1 : 0)]);
            vertices.push([row + 1, col * 2 + i + (row < 2 ? 1 : 0)]);
        }

        return vertices;
    }
}