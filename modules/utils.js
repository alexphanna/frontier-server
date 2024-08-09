/**
 * Generates a map.
 * 
 * @returns {Object} An object containing the generated terrain map and number map.
 */
export function generateMap() {
    let terrainCounts = {
        "Hill": 3,
        "Forest": 4,
        "Mountain": 3,
        "Field": 4,
        "Pasture": 4,
        "Desert": 1
    }
    const terrains = Object.keys(terrainCounts);

    var terrainDistr = terrains.flatMap(terrain => Array(terrainCounts[terrain]).fill(terrain));
    var numberDistr = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
    shuffle(terrainDistr);
    shuffle(numberDistr);
    numberDistr.splice(terrainDistr.indexOf("Desert"), 0, 0);
    let terrainMap = [];
    let numberMap = [];
    for (let i = 0; i < 5; i++) {
        terrainMap.push([]);
        numberMap.push([]);
    }
    for (let i = 3; i <= 5; i++) {
        for (let j = 0; j < i; j++) {
            terrainMap[i - 3].push(terrainDistr.shift());
            numberMap[i - 3].push(numberDistr.shift());
            if (i != 5) {
                terrainMap[7 - i].push(terrainDistr.shift());
                numberMap[7 - i].push(numberDistr.shift());
            }
        }
    }

    let harborMap = [
        ["generic", 0, 0, "grain", 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, "ore"],
        ["lumber", 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, "generic"],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        ["brick", 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, "wool"],
        [0, 0, 0, 0],
        ["generic", 0, 0, "generic", 0, 0],
    ];
    return { terrainMap, numberMap, harborMap };
}

/**
 * Shuffles an array in place using the Fisher-Yates algorithm.
 * @param {Array} array - The array to be shuffled.
 * @returns {Array} - The shuffled array.
 */
export function shuffle(array) {
    let currentIndex = array.length;

    while (currentIndex != 0) {
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }

    return array;
}

export function stringifyResources(resources) {
    let string = '';
    for (let resource in resources) {
        string += `${resources[resource]} ${resource}`;
        if (Object.keys(resources).length == 2) {
            if (Object.keys(resources).indexOf(resource) == 0) {
                string += ' and ';
            }
        }
        else if (Object.keys(resources).indexOf(resource) != Object.keys(resources).length - 1) {
            if (Object.keys(resources).indexOf(resource) == Object.keys(resources).length - 2) {
                string += ' and ';
            }
            else {
                string += ', ';
            }
        }
    }
    return string;
}

export function stringifyTrade(you, them) {
    let string = stringifyResources(you) + ' → ' + stringifyResources(them);
    return string;
}