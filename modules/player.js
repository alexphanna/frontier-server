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
            brick: 20,
            grain: 20,
            lumber: 20,
            ore: 20,
            wool: 20
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