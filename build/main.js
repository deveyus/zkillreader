"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCharacterID = void 0;
/* eslint-disable @typescript-eslint/no-unused-vars */
// Import the necessary modules.
const axios_1 = __importDefault(require("axios"));
// This program uses the zkillboard API to find the pilots and ships that are most assisting a selected pilot.
// Documentation for the API can be found here: https://github.com/zKillboard/zKillboard/wiki/API-(Killmails)
// This program uses the following endpoints:
// - https://zkillboard.com/api/kills/characterID/${characterID}/
// This is a function that takes in a characterID and returns a list of all kills back to a specifc date.
function getKills(characterID, pastSeconds) {
    const maxSeconds = 604800; // 7 days in seconds
    if (pastSeconds > maxSeconds) {
        console.log("The maximum number of seconds is 604800 (7 days). Using that value.");
        pastSeconds = maxSeconds;
    }
    const url = `https://zkillboard.com/api/kills/characterID/${characterID}/pastSeconds/${pastSeconds}/`;
    return axios_1.default.get(url)
        .then(response => {
        const kills = response.data;
        console.log(`Found ${kills.length} kills for ${characterID}`);
        if (kills.length === 0) {
            console.log(`No kills found for ${characterID}`);
            process.exit(1);
        }
        return kills;
    })
        .catch(error => {
        console.log(error);
        return [];
    });
}
// This function takes a list of kills retrieved from zkill and gets the corresponding killmail from ESI.
async function getKillmails(kills) {
    const killmails = [];
    for (const kill of kills) {
        const response = await axios_1.default.get(`https://esi.evetech.net/latest/killmails/${kill.killmail_id}/${kill.zkb.hash}/`);
        killmails.push(response.data);
    }
    return killmails;
}
// This is a function that takes in a list of kills and returns a list of all pilots that have assisted the selected pilot.
function getAssisters(kills, characterID) {
    const assisters = [];
    for (const kill of kills) {
        for (const attacker of kill.attackers) {
            if (attacker.character_id !== characterID && attacker.character_id !== undefined) {
                if (attacker.character_id !== undefined) {
                    assisters.push(attacker.character_id);
                }
            }
        }
    }
    console.log(`Found ${assisters.length} assisters for ${characterID}`);
    return assisters;
}
// This is a function that takes in a list of kills and returns a list of all ship types that have assisted the selected pilot.
function getAssisterShips(kills, characterID) {
    const assisters = [];
    for (const kill of kills) {
        for (const attacker of kill.attackers) {
            if (attacker.character_id === characterID && attacker.ship_type_id !== undefined) {
                assisters.push(attacker.ship_type_id);
            }
        }
    }
    console.log(`Found ${assisters.length} assister ships for ${characterID}`);
    return assisters;
}
// This is a function that takes in single character name and returns the characterID, by querying the ESI API.
async function getCharacterID(characterName) {
    const url = "https://esi.evetech.net/latest/universe/ids/?datasource=tranquility&language=en-us";
    try {
        const response = await axios_1.default.post(url, [characterName]);
        const characterID = response.data.characters[0]?.id;
        if (characterID === undefined) {
            throw new Error(`Character ID not found for ${characterName}`);
        }
        return characterID;
    }
    catch (error) {
        console.log(error);
        process.exit(1);
    }
}
exports.getCharacterID = getCharacterID;
// This is a function that takes a list of characterIDs, and queries the ESI API for the names of the pilots. The query requires a list of unique names, but the function should return duplicates that were present in the input.
async function getCharacterNames(characterIDs) {
    const uniqueIDs = [...new Set(characterIDs)];
    const url = "https://esi.evetech.net/latest/universe/names/";
    try {
        const response = await axios_1.default.post(url, uniqueIDs);
        const idToNameMap = new Map(response.data.map(character => [character.id, character.name]));
        return characterIDs.map(id => ({ id, name: idToNameMap.get(id) || "Unknown", category: "character" }));
    }
    catch (error) {
        console.log(error);
        return [];
    }
}
// This is a function that takes a list of shipIDs and queries the ESI API for the names of the ships, only using unique IDs.
async function getShipNames(shipIDs) {
    const uniqueIDs = [...new Set(shipIDs)];
    const url = "https://esi.evetech.net/latest/universe/names/";
    try {
        const response = await axios_1.default.post(url, uniqueIDs);
        const idToNameMap = new Map(response.data.map(ship => [ship.id, ship.name]));
        return shipIDs.map(id => ({ id, name: idToNameMap.get(id) || "Unknown", category: "ship" }));
    }
    catch (error) {
        console.log(error);
        return [];
    }
}
// Print out a list of pilots, sorted by the number of times they have assisted the selected pilot, and include a link to their zkill page.
function printAssisters(assisters, characterName) {
    const assistersCount = new Map();
    for (const assister of assisters) {
        if (assistersCount.has(assister.id)) {
            assistersCount.set(assister.id, assistersCount.get(assister.id) + 1);
        }
        else {
            assistersCount.set(assister.id, 1);
        }
    }
    console.log(`Assisters for ${characterName}:`);
    for (const [id, count] of assistersCount) {
        console.log(`${assisters.find(a => a.id === id)?.name} - https://zkillboard.com/character/${id}/ (${count} times)`);
    }
}
// Print out a list of ships, sorted by the number of times they have assisted the selected pilot.
function printAssisterShips(assisterShips, characterName) {
    const assisterShipsCount = new Map();
    for (const assisterShip of assisterShips) {
        if (assisterShipsCount.has(assisterShip.id)) {
            assisterShipsCount.set(assisterShip.id, assisterShipsCount.get(assisterShip.id) + 1);
        }
        else {
            assisterShipsCount.set(assisterShip.id, 1);
        }
    }
    console.log(`Assister ships for ${characterName}:`);
    for (const [id, count] of assisterShipsCount) {
        console.log(`${assisterShips.find(s => s.id === id)?.name} - (${count} times)`);
    }
}
// This is the main function of the program.
async function main() {
    // Get the characterID from the command line arguments.
    const characterName = process.argv[2];
    if (!characterName) {
        console.log("Please provide a character name as the first argument.");
        process.exit(1);
    }
    const characterID = await getCharacterID(characterName);
    // Get the name of the principle character.
    const principleCharacter = await getCharacterNames([characterID]);
    if (!principleCharacter[0]) {
        console.log(`Character ID not found for ${characterName}`);
        process.exit(1);
    }
    console.log(`Principle character: ${principleCharacter[0].name}`);
    console.log("Principle character Array: ");
    console.log(principleCharacter);
    // Get the number of seconds from the command line arguments.
    const pastSeconds = Number(process.argv[3]) || 604800;
    // Get the list of kills.
    const zkills = await getKills(characterID, pastSeconds);
    // Convert the list of zkills to killmails.
    const killmails = await getKillmails(zkills);
    // Get the list of assisters.
    const assisters = getAssisters(killmails, characterID);
    // Get assisster names from IDs.
    const assisterNames = await getCharacterNames(assisters);
    // Ger list of assister ship IDs.
    const assisterShips = getAssisterShips(killmails, characterID);
    // Get the list of assister ship names.
    const assisterShipNames = await getShipNames(assisterShips);
    // Print out the list of assisters.
    printAssisters(assisterNames, principleCharacter[0].name);
    // Print out the list of assister ships.
    printAssisterShips(assisterShipNames, principleCharacter[0].name);
}
main();
//# sourceMappingURL=main.js.map