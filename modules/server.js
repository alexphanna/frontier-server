import { game } from "../index.js";
import Player from "./player.js";
import { broadcastPlayers, broadcastPoints } from "./broadcast.js";

export function addPlayer(name, ws) {
    let color = game.availableColors.pop();
    ws.send('color ' + color);
    game.players.add(new Player(name, color));
    game.clients.add(ws);
    ws.send('map ' + JSON.stringify(game.map));
    broadcastPlayers();
    broadcastPoints();
}