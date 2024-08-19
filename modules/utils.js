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

export function joinWithAnd(array) {
    if (array.length == 0) {
        return '';
    }
    else if (array.length == 1) {
        return array[0];
    }
    else {
        return array.slice(0, -1).join(', ') + ' and ' + array[array.length - 1];
    }
}

export function stringifyResources(resources) {
    let resourcesArray = [];
    for (let resource in resources) {
        resourcesArray.push(`${resources[resource]} ${resource}`);
    }
    return joinWithAnd(resourcesArray);
}