import { shuffle } from "./utils";
import { game } from "../index.js";
import { Player } from "./player";
import { broadcastPlayers, broadcastPoints } from "./broadcast";

export function addPlayer(name, ws) {
    const colors = shuffle(["red", "yellow", "lime", "magenta"]);
    ws.send('color ' + colors[game.players.size]);
    game.players.add(new Player(name, colors[game.players.size]));
    game.clients.add(ws);
    ws.send('map ' + JSON.stringify(game.map));
    broadcastPlayers();
    broadcastPoints();
}